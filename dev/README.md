# Dev Home Assistant

A throwaway Home Assistant for trying the card in a real browser and for
the e2e tests. Never point anything here at the real instance.

```bash
mkdir -p dev/config && cp -n dev/config-template/configuration.yaml dev/config/
docker compose -f dev/docker-compose.yml up -d
uv run python dev/seed.py        # retry until it prints a token (last line)
HA_DEV_TOKEN=<token> uv run pytest e2e -v
docker compose -f dev/docker-compose.yml down   # the Pi is short on RAM
```

Open http://<pi>:8125/sequence-scheduler/0 (user `dev`, password `devdevdev`).
Tokens last 30 minutes; re-run `seed.py` for a fresh one.
