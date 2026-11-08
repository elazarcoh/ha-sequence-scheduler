"""Bring the throwaway instance up to a testable state.

Adapted from ha-shabbat-scheduler dev/seed.py. Onboards a fresh container,
creates the integration's config entry, seeds one template, clears the
queue, adds a dashboard holding the card, and prints a token for the e2e
tests (it is the last line of output).

Points at localhost:8125 only. It must never be aimed at a real instance.
"""

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8125"


def _post(path: str, payload: dict, token: str | None = None) -> dict:
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode()
    return json.loads(body) if body else {}


USERNAME = "dev"
PASSWORD = "devdevdev"


def _exchange(code: str) -> str:
    """Trade an auth code for an access token."""
    request = urllib.request.Request(
        f"{BASE}/auth/token",
        data=(
            f"grant_type=authorization_code&code={code}&client_id={BASE}"
        ).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())["access_token"]


def log_in() -> str:
    """Get a token for an instance that is ALREADY onboarded.

    This script is not once-only. Onboarding can only happen once per
    container state, so every re-run used to die on a bare `403 Forbidden`
    from /api/onboarding/users - and the advice was to tear the container
    down and start over, which is a heavy answer to "I want to re-seed".
    Logging in is what a human would do, so do that instead.
    """
    flow = _post(
        "/auth/login_flow",
        {
            "client_id": BASE,
            "handler": ["homeassistant", None],
            "redirect_uri": BASE,
            "type": "authorize",
        },
    )
    step = _post(
        f"/auth/login_flow/{flow['flow_id']}",
        {"client_id": BASE, "username": USERNAME, "password": PASSWORD},
    )
    if "result" not in step:
        raise SystemExit(
            f"logging in as {USERNAME} failed: {step}. If the password was "
            f"changed, reset the instance - see dev/README.md."
        )
    return _exchange(step["result"])


def onboard() -> str:
    """Create the owner, exchange the auth code for a token, and finish
    the remaining onboarding steps. Falls back to logging in if the
    instance has already been onboarded, so this script is re-runnable.

    A token alone is not enough: as long as any of the four onboarding
    steps (user, core_config, analytics, integration) is unfinished, the
    frontend redirects every page - including /lovelace/0 - to
    /onboarding.html, so the e2e browser never reaches the card. The
    HA-owned onboarding UI would normally walk a human through the rest;
    scripting them here is what makes the container usable headlessly.
    """
    try:
        result = _post(
            "/api/onboarding/users",
            {
                "client_id": BASE,
                "name": "Dev",
                "username": USERNAME,
                "password": PASSWORD,
                "language": "en",
            },
        )
    except urllib.error.HTTPError as err:
        # Already onboarded. Home Assistant answers this endpoint with
        # EITHER code depending on how far onboarding got: 403 while the
        # onboarding views are still registered but the owner exists, and
        # 404 once they have been torn down entirely. Catching only 403
        # made re-runs fail with a bare traceback on a fully-onboarded
        # instance - which is the normal case for every run after the
        # first. Anything else is a real problem and is not swallowed.
        if err.code not in (403, 404):
            raise
        return log_in()

    token = _exchange(result["auth_code"])
    _post("/api/onboarding/core_config", {}, token)
    _post("/api/onboarding/analytics", {}, token)
    _post(
        "/api/onboarding/integration",
        {"client_id": BASE, "redirect_uri": f"{BASE}/"},
        token,
    )
    return token



DASHBOARD_URL_PATH = "sequence-scheduler"

KIDS = {
    "key": "kids",
    "name": "Kids AC",
    "start": [{
        "action": "climate.set_temperature",
        "target": {"entity_id": ["climate.dev_kids"]},
        "data": {"hvac_mode": "cool", "temperature": 26},
    }],
    "end": [{
        "action": "climate.turn_off",
        "target": {"entity_id": ["climate.dev_kids"]},
        "data": {},
    }],
    "placeholders": [{
        "key": "temp", "field": "temperature", "kind": "number",
        "default": 26, "min": 14, "max": 31,
    }],
}


def create_config_entry(token: str) -> None:
    started = _post(
        "/api/config/config_entries/flow",
        {"handler": "sequence_scheduler", "show_advanced_options": False},
        token,
    )
    if started.get("type") == "abort" and started.get("reason") == "single_instance_allowed":
        return
    if started.get("type") != "create_entry":
        raise SystemExit(f"unexpected result from the config flow: {started}")


async def _ws(token: str):
    import websockets  # provided by the playwright dev dependency chain

    uri = BASE.replace("http://", "ws://") + "/api/websocket"
    socket = await websockets.connect(uri)
    await socket.recv()  # auth_required
    await socket.send(json.dumps({"type": "auth", "access_token": token}))
    reply = json.loads(await socket.recv())
    if reply.get("type") != "auth_ok":
        raise SystemExit(f"websocket auth failed: {reply}")
    counter = {"id": 0}

    async def call(payload: dict) -> dict:
        counter["id"] += 1
        await socket.send(json.dumps({"id": counter["id"], **payload}))
        while True:
            msg = json.loads(await socket.recv())
            if msg.get("id") == counter["id"] and msg.get("type") == "result":
                return msg

    return socket, call


def seed(token: str) -> None:
    """Idempotent: same end state however many times it runs."""
    import asyncio

    async def _send() -> None:
        socket, call = await _ws(token)
        try:
            listed = await call({"type": "sequence_scheduler/templates/list"})
            if not listed.get("success"):
                raise SystemExit(f"listing templates failed: {listed}")
            for t in listed["result"]["templates"]:
                await call({"type": "sequence_scheduler/templates/delete", "template_id": t["id"]})
            reply = await call({"type": "sequence_scheduler/templates/save", "template": KIDS})
            if not reply.get("success"):
                raise SystemExit(f"seeding the template failed: {reply}")
            queued = await call({"type": "sequence_scheduler/queue/list"})
            for b in queued["result"]["blocks"]:
                await call({"type": "sequence_scheduler/queue/cancel", "block_id": b["id"], "run_end": False})

            reply = await call({
                "type": "lovelace/dashboards/create",
                "url_path": DASHBOARD_URL_PATH,
                "title": "Sequence Scheduler",
                "mode": "storage",
                "show_in_sidebar": True,
            })
            if not reply.get("success") and reply.get("error", {}).get("translation_key") != "url_already_exists":
                raise SystemExit(f"creating the dashboard failed: {reply}")
            reply = await call({
                "type": "lovelace/config/save",
                "url_path": DASHBOARD_URL_PATH,
                "config": {"views": [{"title": "Card", "cards": [{"type": "custom:sequence-scheduler-card"}]}]},
            })
            if not reply.get("success"):
                raise SystemExit(f"saving the dashboard failed: {reply}")
        finally:
            await socket.close()

    asyncio.run(_send())


if __name__ == "__main__":
    access_token = onboard()
    create_config_entry(access_token)
    seed(access_token)
    print(access_token)
    sys.exit(0)
