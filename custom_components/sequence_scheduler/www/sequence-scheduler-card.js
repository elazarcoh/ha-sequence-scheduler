function t(t,e,s,i){var r,o=arguments.length,n=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(n=(o<3?r(n):o>3?r(e,s,n):r(e,s))||n);return o>3&&n&&Object.defineProperty(e,s,n),n}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),r=new WeakMap;let o=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&r.set(e,t))}return t}toString(){return this.cssText}};const n=(t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new o(s,t,i)},a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new o("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:l,defineProperty:h,getOwnPropertyDescriptor:d,getOwnPropertyNames:c,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,_=globalThis,m=_.trustedTypes,v=m?m.emptyScript:"",$=_.reactiveElementPolyfillSupport,g=(t,e)=>t,y={toAttribute(t,e){switch(e){case Boolean:t=t?v:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},f=(t,e)=>!l(t,e),b={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:f};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let x=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=b){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&h(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:r}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const o=i?.call(this);r?.call(this,e),this.requestUpdate(t,o,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(g("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(g("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(g("properties"))){const t=this.properties,e=[...c(t),...p(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),r=e.litNonce;void 0!==r&&i.setAttribute("nonce",r),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const r=(void 0!==s.converter?.toAttribute?s.converter:y).toAttribute(e,s.type);this._$Em=t,null==r?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:y;this._$Em=i;const o=r.fromAttribute(e,t.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(t,e,s,i=!1,r){if(void 0!==t){const o=this.constructor;if(!1===i&&(r=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??f)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:r},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),!0!==r||void 0!==o)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[g("elementProperties")]=new Map,x[g("finalized")]=new Map,$?.({ReactiveElement:x}),(_.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const w=globalThis,k=t=>t,A=w.trustedTypes,S=A?A.createPolicy("lit-html",{createHTML:t=>t}):void 0,E="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,q="?"+C,P=`<${q}>`,T=document,O=()=>T.createComment(""),R=t=>null===t||"object"!=typeof t&&"function"!=typeof t,U=Array.isArray,j="[ \t\n\f\r]",M=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,H=/-->/g,N=/>/g,L=RegExp(`>|${j}(?:([^\\s"'>=/]+)(${j}*=${j}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,D=/"/g,I=/^(?:script|style|textarea|title)$/i,W=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),B=Symbol.for("lit-noChange"),F=Symbol.for("lit-nothing"),Q=new WeakMap,V=T.createTreeWalker(T,129);function J(t,e){if(!U(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}const K=(t,e)=>{const s=t.length-1,i=[];let r,o=2===e?"<svg>":3===e?"<math>":"",n=M;for(let e=0;e<s;e++){const s=t[e];let a,l,h=-1,d=0;for(;d<s.length&&(n.lastIndex=d,l=n.exec(s),null!==l);)d=n.lastIndex,n===M?"!--"===l[1]?n=H:void 0!==l[1]?n=N:void 0!==l[2]?(I.test(l[2])&&(r=RegExp("</"+l[2],"g")),n=L):void 0!==l[3]&&(n=L):n===L?">"===l[0]?(n=r??M,h=-1):void 0===l[1]?h=-2:(h=n.lastIndex-l[2].length,a=l[1],n=void 0===l[3]?L:'"'===l[3]?D:z):n===D||n===z?n=L:n===H||n===N?n=M:(n=L,r=void 0);const c=n===L&&t[e+1].startsWith("/>")?" ":"";o+=n===M?s+P:h>=0?(i.push(a),s.slice(0,h)+E+s.slice(h)+C+c):s+C+(-2===h?e:c)}return[J(t,o+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};let Z=class t{constructor({strings:e,_$litType$:s},i){let r;this.parts=[];let o=0,n=0;const a=e.length-1,l=this.parts,[h,d]=K(e,s);if(this.el=t.createElement(h,i),V.currentNode=this.el.content,2===s||3===s){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(r=V.nextNode())&&l.length<a;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(E)){const e=d[n++],s=r.getAttribute(t).split(C),i=/([.?@])?(.*)/.exec(e);l.push({type:1,index:o,name:i[2],strings:s,ctor:"."===i[1]?et:"?"===i[1]?st:"@"===i[1]?it:tt}),r.removeAttribute(t)}else t.startsWith(C)&&(l.push({type:6,index:o}),r.removeAttribute(t));if(I.test(r.tagName)){const t=r.textContent.split(C),e=t.length-1;if(e>0){r.textContent=A?A.emptyScript:"";for(let s=0;s<e;s++)r.append(t[s],O()),V.nextNode(),l.push({type:2,index:++o});r.append(t[e],O())}}}else if(8===r.nodeType)if(r.data===q)l.push({type:2,index:o});else{let t=-1;for(;-1!==(t=r.data.indexOf(C,t+1));)l.push({type:7,index:o}),t+=C.length-1}o++}}static createElement(t,e){const s=T.createElement("template");return s.innerHTML=t,s}};function G(t,e,s=t,i){if(e===B)return e;let r=void 0!==i?s._$Co?.[i]:s._$Cl;const o=R(e)?void 0:e._$litDirective$;return r?.constructor!==o&&(r?._$AO?.(!1),void 0===o?r=void 0:(r=new o(t),r._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=r:s._$Cl=r),void 0!==r&&(e=G(t,r._$AS(t,e.values),r,i)),e}class X{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??T).importNode(e,!0);V.currentNode=i;let r=V.nextNode(),o=0,n=0,a=s[0];for(;void 0!==a;){if(o===a.index){let e;2===a.type?e=new Y(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new rt(r,this,t)),this._$AV.push(e),a=s[++n]}o!==a?.index&&(r=V.nextNode(),o++)}return V.currentNode=T,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Y{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=F,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=G(this,t,e),R(t)?t===F||null==t||""===t?(this._$AH!==F&&this._$AR(),this._$AH=F):t!==this._$AH&&t!==B&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>U(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==F&&R(this._$AH)?this._$AA.nextSibling.data=t:this.T(T.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=Z.createElement(J(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new X(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=Q.get(t.strings);return void 0===e&&Q.set(t.strings,e=new Z(t)),e}k(t){U(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const r of t)i===e.length?e.push(s=new Y(this.O(O()),this.O(O()),this,this.options)):s=e[i],s._$AI(r),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=k(t).nextSibling;k(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,r){this.type=1,this._$AH=F,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=r,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=F}_$AI(t,e=this,s,i){const r=this.strings;let o=!1;if(void 0===r)t=G(this,t,e,0),o=!R(t)||t!==this._$AH&&t!==B,o&&(this._$AH=t);else{const i=t;let n,a;for(t=r[0],n=0;n<r.length-1;n++)a=G(this,i[s+n],e,n),a===B&&(a=this._$AH[n]),o||=!R(a)||a!==this._$AH[n],a===F?t=F:t!==F&&(t+=(a??"")+r[n+1]),this._$AH[n]=a}o&&!i&&this.j(t)}j(t){t===F?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===F?void 0:t}}class st extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==F)}}class it extends tt{constructor(t,e,s,i,r){super(t,e,s,i,r),this.type=5}_$AI(t,e=this){if((t=G(this,t,e,0)??F)===B)return;const s=this._$AH,i=t===F&&s!==F||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==F&&(s===F||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){G(this,t)}}const ot=w.litHtmlPolyfillSupport;ot?.(Z,Y),(w.litHtmlVersions??=[]).push("3.3.3");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class at extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let r=i._$litPart$;if(void 0===r){const t=s?.renderBefore??null;i._$litPart$=r=new Y(e.insertBefore(O(),t),t,void 0,s??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return B}}at._$litElement$=!0,at.finalized=!0,nt.litElementHydrateSupport?.({LitElement:at});const lt=nt.litElementPolyfillSupport;lt?.({LitElement:at}),(nt.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ht=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:f},ct=(t=dt,e,s)=>{const{kind:i,metadata:r}=s;let o=globalThis.litPropertyMetadata.get(r);if(void 0===o&&globalThis.litPropertyMetadata.set(r,o=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),o.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const r=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,r,t,!0,s)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const r=this[i];e.call(this,s),this.requestUpdate(i,r,t,!0,s)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return(e,s)=>"object"==typeof s?ct(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ut(t){return pt({...t,state:!0,attribute:!1})}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class _t{constructor(t){this.hass=t}async listTemplates(){return(await this.hass.callWS({type:"sequence_scheduler/templates/list"})).templates}async saveTemplate(t){return(await this.hass.callWS({type:"sequence_scheduler/templates/save",template:t})).template}async deleteTemplate(t){await this.hass.callWS({type:"sequence_scheduler/templates/delete",template_id:t})}preview(t){return this.hass.callWS({type:"sequence_scheduler/preview",text:t})}queue(t,e,s){return this.hass.callWS({type:"sequence_scheduler/queue",text:t,now:e,token:s})}async cancel(t,e){await this.hass.callWS({type:"sequence_scheduler/queue/cancel",block_id:t,run_end:e})}subscribeQueue(t){return this.hass.connection.subscribeMessage(e=>t(e.blocks),{type:"sequence_scheduler/queue/subscribe"})}}function mt(t,e){const s=new Intl.DateTimeFormat("en-GB",{timeZone:e,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}),i=Object.fromEntries(s.formatToParts(new Date(t)).map(t=>[t.type,t.value]));return{day:`${i.year}-${i.month}-${i.day}`,time:`${i.hour}:${i.minute}`}}function vt(t,e){return mt(t,e).time}const $t=/^([01]?\d|2[0-3]):([0-5]\d)$/,gt=/^([01]?\d|2[0-3])([0-5]\d)$/,yt=/^(0?[1-9]|1[0-2])(:?[0-5]\d)?(am|pm)$/i,ft=(t,e=!0)=>$t.test(t)||yt.test(t)||e&&gt.test(t),bt=[/^\d+(\.\d+)?h$/i,/^\d+m$/i,/^\d+h\d{1,2}m?$/i],xt=t=>bt.some(e=>e.test(t));function wt(t){const e=t.resolved_options??t.options,s=String(t.default);return e&&e.length?`${t.key} (${s}: ${e.join(" / ")})`:`${t.key} (${s})`}function kt(t,e){const s=t.trimStart();if(!s||s.startsWith("#"))return null;const i=s.split(/\s+/).filter(Boolean),r=1===i.length&&!/\s$/.test(s),o=i[0].toLocaleLowerCase();if(r){const t=e.map(t=>t.key).filter(t=>t.toLocaleLowerCase().startsWith(o));return t.length?t.join(" · "):"unknown template"}const n=e.find(t=>t.key.toLocaleLowerCase()===o);if(!n)return"unknown template";if(i.length<2)return null;const a=function(t){const[e,...s]=t.split("-");return!(ft(e)||"now"===e.toLowerCase()||e.startsWith("+")&&xt(e.slice(1)))||s.length>1?{ok:!1,range:!1}:1===s.length?{ok:ft(s[0]),range:!0}:{ok:!0,range:!1}}(i[1]);if(!a.ok)return null;let l=i.slice(2);!a.range&&l.length&&(xt(l[0])||ft(l[0],!1))&&(l=l.slice(1));const h=new Set(l.filter(t=>t.includes("=")).map(t=>t.split("=",1)[0].toLocaleLowerCase())),d=l.filter(t=>!t.includes("=")).length,c=n.placeholders.filter((t,e)=>e>=d&&!h.has(t.key.toLocaleLowerCase()));return c.length?c.map(wt).join(" · "):null}const At="Sequence Scheduler",St="Queue",Et="Templates",Ct="Only an administrator can use the Sequence Scheduler.",qt=t=>`Queue ${t}`,Pt="from Queue press",Tt="start failed",Ot="start skipped",Rt=t=>`fix ${t}`,Ut=t=>`Queued ${t}`,jt=t=>`Not queued: ${t.join("; ")}`,Mt="Something changed. Check the list and queue again.",Ht="Nothing queued.",Nt="Cancel",Lt="running",zt="Turn it off now?",Dt="Run the end now",It="Just cancel",Wt="Keep it",Bt="Add template",Ft="Edit",Qt="Delete",Vt=t=>`Delete "${t}"? Already queued plans keep running.`,Jt="Save",Kt="Close",Zt="Short name",Gt="Display name",Xt="Start",Yt="End",te="No end (start only)",ee="Add action",se="Remove",ie="Placeholders",re="Add placeholder",oe="Name",ne="Field",ae="Default",le="No templates yet.";let he=class extends at{constructor(){super(...arguments),this.hass=null,this._text="",this._preview=null,this._templates=[],this._hint=null,this._message="",this._busy=!1,this._timer=null,this._seq=0,this._loadedFor=null}firstUpdated(){this._textarea.addEventListener("input",t=>this._onInput(t)),this._textarea.addEventListener("click",()=>this._updateHint()),this._textarea.addEventListener("keyup",()=>this._updateHint())}updated(){this.hass&&this._loadedFor!==this.hass&&0===this._templates.length&&(this._loadedFor=this.hass,this._loadTemplates())}disconnectedCallback(){super.disconnectedCallback(),this._timer&&clearTimeout(this._timer)}async _loadTemplates(){try{this._templates=await new _t(this.hass).listTemplates(),this._updateHint()}catch{}}_onInput(t){this._text=t.target.value,this._message="",this._updateHint(),this._timer&&clearTimeout(this._timer),this._timer=setTimeout(()=>this._runPreview(),300)}_updateHint(){const t=this._textarea,e=t?.selectionStart??this._text.length,s=this._text.slice(0,e).lastIndexOf("\n")+1,i=this._text.indexOf("\n",e),r=this._text.slice(s,-1===i?void 0:i);this._hint=kt(r,this._templates)}async _runPreview(){this._timer=null;const t=++this._seq;if(this._text.trim())try{const e=await new _t(this.hass).preview(this._text);t===this._seq&&(this._preview=e)}catch(e){t===this._seq&&(this._message=e?.message??String(e))}else this._preview=null}get _counts(){const t=this._preview?.rows??[];return{ok:t.filter(t=>t.ok).length,bad:t.filter(t=>!t.ok).length}}async _queue(){const t=this._preview;if(t&&!this._busy){this._busy=!0;try{const{queued:e,refused:s=[]}=await new _t(this.hass).queue(this._text,t.now,t.token);this._text=s.map(t=>t.raw).join("\n"),this._preview=null,this._hint=null,this._textarea&&(this._textarea.value=this._text);const i=t=>t.errors.map(t=>t.detail.replace(/^line \d+: /,"")).join(", ");this._message=s.length?`${Ut(e)}. ${jt(s.map(t=>`${t.raw} (${i(t)})`))}`:Ut(e),s.length&&await this._runPreview()}catch(t){"preview_changed"===t?.code?(await this._runPreview(),this._message=Mt):this._message=t?.message??String(t)}finally{this._busy=!1}}}_row(t){const e=this.hass?.config?.time_zone,s=this._preview.now,i=t.relative?"≈":"",r=t.start_at?i+(t.end_at?`${vt(t.start_at,e)}–${vt(t.end_at,e)}`:vt(t.start_at,e)):"--:--";return W`<div class="row">
      <span class="time" dir="ltr">${r}</span>
      ${t.start_at?W`<span class="day">${t.relative?Pt:function(t,e,s){const i=mt(t,s).day;return i===mt(e,s).day?"today":i===mt(new Date(new Date(e).getTime()+864e5).toISOString(),s).day?"tomorrow":i}(t.start_at,s,e)}</span>`:F}
      <span class="name" dir="auto">${t.template_name??t.raw}</span>
      <span class="values" dir="auto">${o=t.values,Object.values(o).map(String).join(" · ")}</span>
      ${t.ok?W`<span class="ok">✓</span>`:F}
      ${t.errors.map(t=>W`<span class="error" dir="auto">${t.detail}</span>`)}
      ${t.warnings.map(t=>W`<span class="warning" dir="auto">${t.detail}</span>`)}
    </div>`;var o}render(){const{ok:t,bad:e}=this._counts,s=e?`${qt(t)} · ${Rt(e)}`:qt(t);return W`
      <!-- No Lit bindings on the textarea: listeners are attached in
           firstUpdated and the value is read and cleared on the element. -->
      <textarea dir="auto" spellcheck="false" autocapitalize="off" placeholder="kids 01:00 1h 25"></textarea>
      <div class="hint" dir="auto">${this._hint??""}</div>
      <div class="rows">${this._preview?this._preview.rows.map(t=>this._row(t)):F}</div>
      <div class="actions">
        <span class="message">${this._message}</span>
        <button class="queue" ?disabled=${0===t||this._busy} @click=${this._queue}>${s}</button>
      </div>
    `}};he.styles=n`
    textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 7em;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 15px;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .hint {
      min-height: 1.4em;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin: 4px 0 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
      padding: 6px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      margin: 4px 0;
    }
    .time {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      min-width: 6.5em;
    }
    .day,
    .values {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .ok {
      color: var(--success-color, #2e7d32);
    }
    .error {
      color: var(--error-color, #c62828);
      flex-basis: 100%;
      font-size: 0.9em;
    }
    .warning {
      color: var(--warning-color, #b26a00);
      flex-basis: 100%;
      font-size: 0.9em;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    button.queue {
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button.queue[disabled] {
      opacity: 0.5;
      cursor: default;
    }
    .message {
      color: var(--secondary-text-color);
    }
  `,t([pt({attribute:!1})],he.prototype,"hass",void 0),t([ut()],he.prototype,"_text",void 0),t([ut()],he.prototype,"_preview",void 0),t([ut()],he.prototype,"_templates",void 0),t([ut()],he.prototype,"_hint",void 0),t([ut()],he.prototype,"_message",void 0),t([ut()],he.prototype,"_busy",void 0),t([
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function(t){return(e,s,i)=>((t,e,s)=>(s.configurable=!0,s.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,s),s))(e,s,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}("textarea")],he.prototype,"_textarea",void 0),he=t([ht("seq-queue-entry")],he);let de=class extends at{constructor(){super(...arguments),this.hass=null,this._blocks=null,this._asking=null,this._error="",this._unsub=null,this._subscribedTo=null}updated(){this.hass&&this.isConnected&&this._subscribedTo!==this.hass&&!this._unsub&&(this._subscribedTo=this.hass,this._subscribe())}connectedCallback(){super.connectedCallback(),this.hass&&!this._unsub&&this._subscribe()}disconnectedCallback(){super.disconnectedCallback();const t=this._unsub;this._unsub=null,this._subscribedTo=null,t&&t()}async _subscribe(){this._subscribedTo=this.hass;try{const t=await new _t(this.hass).subscribeQueue(t=>this._blocks=t);this.isConnected?this._unsub=t:t()}catch(t){this._error=t?.message??String(t)}}_startState(t){const e=t.start_detail?`: ${t.start_detail}`:"";return"failed"===t.start_outcome?`${Tt}${e}`:t.start_outcome?.startsWith("skipped")?`${Ot}${e}`:Lt}_isRunning(t){return!t.steps.some(t=>"start"===t.phase)&&t.steps.some(t=>"end"===t.phase)}_onCancel(t){this._isRunning(t)?this._asking=t.id:this._cancel(t.id,!1)}async _cancel(t,e){this._asking=null;try{await new _t(this.hass).cancel(t,e)}catch(t){this._error=t?.message??String(t)}}_steps(t){const e=this.hass?.config?.time_zone;return(this._isRunning(t)?`${this._startState(t)} · `:"")+t.steps.map(t=>`${"start"===t.phase?"start":"end"} ${vt(t.at,e)}${"in_progress"===t.state?` (${Lt})`:""}`).join(" · ")}_block(t){return W`<div class="block">
      <div class="head">
        <span class="line" dir="auto">${t.line}</span>
        <button class="cancel" @click=${()=>this._onCancel(t)}>${Nt}</button>
      </div>
      <div class="name" dir="auto">${t.template_name}</div>
      <div class="steps" dir="ltr">${this._steps(t)}</div>
      ${this._asking===t.id?W`<div class="ask">
            <span>${zt}</span>
            <button class="run-end" @click=${()=>this._cancel(t.id,!0)}>${Dt}</button>
            <button class="just-cancel" @click=${()=>this._cancel(t.id,!1)}>${It}</button>
            <button class="keep" @click=${()=>this._asking=null}>${Wt}</button>
          </div>`:F}
    </div>`}render(){return W`<div class="list">
      ${this._error?W`<div class="error">${this._error}</div>`:F}
      ${null===this._blocks?F:0===this._blocks.length?W`<div class="empty">${Ht}</div>`:this._blocks.map(t=>this._block(t))}
    </div>`}};function ce(t,e){if(t){if(t[e])return t[e];for(const s of Object.values(t))if(s&&"object"==typeof s&&s.fields){const t=ce(s.fields,e);if(t)return t}}}function pe(t,e,s){const[i,r]=e.split(".",2),o=ce(t?.services?.[i]?.[r]?.fields,s)?.selector??{};if(o.number){const t={kind:s.endsWith("_pct")?"percent":"number"};return"number"==typeof o.number.min&&(t.min=o.number.min),"number"==typeof o.number.max&&(t.max=o.number.max),t}return o.select?.options?.length?{kind:"select",options:o.select.options.map(t=>String("object"==typeof t?t.value:t))}:s.endsWith("_mode")?{kind:"select"}:{kind:"text"}}de.styles=n`
    .block {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px;
      margin: 6px 0;
    }
    .head {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .line {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      flex: 1;
    }
    .steps,
    .name {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .steps {
      font-variant-numeric: tabular-nums;
    }
    .ask {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    button {
      font: inherit;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .empty,
    .error {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
  `,t([pt({attribute:!1})],de.prototype,"hass",void 0),t([ut()],de.prototype,"_blocks",void 0),t([ut()],de.prototype,"_asking",void 0),t([ut()],de.prototype,"_error",void 0),de=t([ht("seq-queue-list")],de);let ue=class extends at{constructor(){super(...arguments),this.hass=null,this.actions=[],this.value=[]}get _fields(){const t=[];for(const e of this.actions)for(const s of Object.keys(e.data??{}))t.includes(s)||t.push(s);return t}_emit(t){this.dispatchEvent(new CustomEvent("placeholders-changed",{detail:{value:t}}))}_update(t,e){this._emit(this.value.map((s,i)=>i===t?{...s,...e}:s))}_onField(t,e){const s=this.actions.find(t=>t.data&&e in t.data),i=s?pe(this.hass,s.action,e):{kind:"text"},r=s?.data[e],o=this.value[t];this._update(t,{field:e,key:o.key||e,kind:i.kind,min:i.min??null,max:i.max??null,options:i.options??null,default:"number"===i.kind||"percent"===i.kind?Number(r):void 0===r?"":String(r)})}_onDefault(t,e){const s=this.value[t];this._update(t,{default:"number"===s.kind||"percent"===s.kind?Number(e):e})}render(){const t=this._fields;return W`<div class="rows">
      ${this.value.map((e,s)=>W`<div class="row">
          <input class="key" dir="auto" .value=${e.key} placeholder=${oe}
            @change=${t=>this._update(s,{key:t.target.value.trim()})} />
          <select class="field" @change=${t=>this._onField(s,t.target.value)}>
            <option value="" ?selected=${!e.field}>${ne}</option>
            ${t.map(t=>W`<option value=${t} ?selected=${t===e.field}>${t}</option>`)}
          </select>
          <span class="kind">${e.kind}</span>
          <input class="default" dir="auto" .value=${String(e.default??"")} placeholder=${ae}
            @change=${t=>this._onDefault(s,t.target.value)} />
          <button class="remove" @click=${()=>this._emit(this.value.filter((t,e)=>e!==s))}>×</button>
        </div>`)}
      <button class="add" @click=${()=>this._emit([...this.value,{key:"",field:"",kind:"text",default:"",min:null,max:null,options:null}])}>${re}</button>
    </div>`}};ue.styles=n`
    .row {
      display: grid;
      grid-template-columns: 1fr 1.3fr auto 1fr auto;
      gap: 6px;
      align-items: center;
      margin: 4px 0;
    }
    input,
    select {
      font: inherit;
      min-width: 0;
      padding: 4px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .kind {
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    button {
      font: inherit;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      color: var(--primary-text-color);
      padding: 4px 8px;
      cursor: pointer;
    }
  `,t([pt({attribute:!1})],ue.prototype,"hass",void 0),t([pt({attribute:!1})],ue.prototype,"actions",void 0),t([pt({attribute:!1})],ue.prototype,"value",void 0),ue=t([ht("seq-placeholder-editor")],ue);let _e=class extends at{constructor(){super(...arguments),this.hass=null,this.action="",this.data={},this.target=null,this.disabled=!1,this._onChange=t=>{const e=t.detail?.value??{},s={action:"string"==typeof e.action?e.action:""};"object"==typeof e.data&&null!==e.data&&(s.data=e.data),this.dispatchEvent(new CustomEvent("service-changed",{detail:s}))},this._observer=null}render(){return W`
      <div class="wrap">
        <!-- No \`showAdvanced\`. It was passed here for a while, first
             hard-coded true and then following the user's own preference -
             but \`ha-service-control\` has no such property in this Home
             Assistant version. Its full property list is \`hass, value,
             disabled, narrow, showServiceId, hidePicker, hideDescription\`,
             so the binding was inert and the tests asserting it only
             passed because happy-dom accepts any property on an element it
             has never heard of. Which advanced fields render is HA's
             decision, made inside its own element. -->
        <ha-service-control
          .hass=${this.hass}
          .value=${this.target&&Object.keys(this.target).length?{action:this.action,target:this.target,data:this.data}:{action:this.action,data:this.data}}
          .disabled=${this.disabled}
          @value-changed=${this._onChange}
        ></ha-service-control>
      </div>
    `}get _control(){return this.shadowRoot?.querySelector("ha-service-control")??null}async updated(){const t=this._control;t?.updateComplete&&await t.updateComplete,this.suppressTargetRows(),this._watch()}disconnectedCallback(){super.disconnectedCallback(),this._observer?.disconnect(),this._observer=null}_watch(){const t=this._control?.shadowRoot;!this._observer&&t&&(this._observer=new MutationObserver(()=>this.suppressTargetRows()),this._observer.observe(t,{childList:!0}))}suppressTargetRows(){const t=this._control?.shadowRoot;if(!t)return 0;const e=[...t.querySelectorAll("ha-selector")].filter(t=>{const e=t.selector;return"object"==typeof e&&null!==e&&"target"in e});for(const t of e)t.style.setProperty("display","none","important");return this.setAttribute("data-target-rows-suppressed",String(e.length)),e.length}};_e.styles=n`
    :host { display: block; }
  `,t([pt({attribute:!1})],_e.prototype,"hass",void 0),t([pt()],_e.prototype,"action",void 0),t([pt({attribute:!1})],_e.prototype,"data",void 0),t([pt({attribute:!1})],_e.prototype,"target",void 0),t([pt({type:Boolean})],_e.prototype,"disabled",void 0),_e=t([ht("seq-service-editor")],_e);let me=class extends at{constructor(){super(...arguments),this.hass=null,this.value={},this.disabled=!1,this._onChange=t=>{const e=t.detail?.value??{};this.dispatchEvent(new CustomEvent("target-changed",{detail:{value:e}}))}}render(){return W`<ha-selector
      .hass=${this.hass}
      .selector=${{target:{}}}
      .value=${this.value}
      .disabled=${this.disabled}
      @value-changed=${this._onChange}
    ></ha-selector>`}};me.styles=n`
    :host {
      display: block;
    }
  `,t([pt({attribute:!1})],me.prototype,"hass",void 0),t([pt({attribute:!1})],me.prototype,"value",void 0),t([pt({type:Boolean})],me.prototype,"disabled",void 0),me=t([ht("seq-target-editor")],me);const ve=(t={})=>({action:"",target:{...t},data:{}}),$e=t=>({action:t.action,target:{...t.target},data:{...t.data}});let ge=class extends at{constructor(){super(...arguments),this.hass=null,this.template=null,this._key="",this._name="",this._start=[ve()],this._end=[ve()],this._noEnd=!1,this._placeholders=[],this._error="",this._busy=!1,this._loaded=void 0}willUpdate(){if(this._loaded===this.template)return;this._loaded=this.template;const t=this.template;t&&(this._key=t.key,this._name=t.name,this._start=t.start.length?t.start.map($e):[ve()],this._end=t.end.length?t.end.map($e):[ve(this._start[0].target)],this._noEnd=0===t.end.length,this._placeholders=t.placeholders.map(t=>({...t})))}_list(t){return"start"===t?this._start:this._end}_set(t,e){if("start"===t){const t=this._end[0],s=1===this._end.length&&!t.action&&0===Object.keys(t.target).length;this._start=e,s&&e[0]&&(this._end=[ve(e[0].target)])}else this._end=e}_patch(t,e,s){this._set(t,this._list(t).map((t,i)=>i===e?{...t,...s}:t))}_add(t){const e=this._list(t),s=e[e.length-1]??this._start[this._start.length-1];this._set(t,[...e,ve(s?.target??{})])}_remove(t,e){const s=this._list(t).filter((t,s)=>s!==e);this._set(t,s.length?s:[ve()])}_onService(t,e,s){const i={action:s.detail.action};void 0!==s.detail.data?i.data=s.detail.data:s.detail.action!==this._list(t)[e].action&&(i.data={}),this._patch(t,e,i)}async _save(){this._busy=!0,this._error="";const t={...this.template?{id:this.template.id}:{},key:this._key.trim(),name:this._name.trim()||this._key.trim(),start:this._start.map($e),end:this._noEnd?[]:this._end.map($e),placeholders:this._placeholders};try{const e=await new _t(this.hass).saveTemplate(t);this.dispatchEvent(new CustomEvent("saved",{detail:{template:e}}))}catch(t){this._error=t?.message??String(t)}finally{this._busy=!1}}_section(t,e){return W`<div class=${t}>
      <h4>${e}</h4>
      ${this._list(t).map((e,s)=>W`<div class="action">
          <seq-target-editor
            .hass=${this.hass}
            .value=${e.target}
            @target-changed=${e=>this._patch(t,s,{target:e.detail.value})}
          ></seq-target-editor>
          <seq-service-editor
            .hass=${this.hass}
            .action=${e.action}
            .target=${e.target}
            .data=${e.data}
            @service-changed=${e=>this._onService(t,s,e)}
          ></seq-service-editor>
          ${this._list(t).length>1?W`<button class="remove-action" @click=${()=>this._remove(t,s)}>${se}</button>`:F}
        </div>`)}
      <button class="add-action" @click=${()=>this._add(t)}>${ee}</button>
    </div>`}render(){const t=[...this._start,...this._noEnd?[]:this._end];return W`<div class="form">
      <label>${Zt}
        <input type="text" class="key" dir="auto" .value=${this._key}
          @input=${t=>this._key=t.target.value} />
      </label>
      <label>${Gt}
        <input type="text" class="name" dir="auto" .value=${this._name}
          @input=${t=>this._name=t.target.value} />
      </label>
      ${this._section("start",Xt)}
      <h4>${Yt}</h4>
      <label class="inline">
        <input type="checkbox" class="no-end" .checked=${this._noEnd}
          @change=${t=>this._noEnd=t.target.checked} />
        ${te}
      </label>
      ${this._noEnd?F:this._section("end","")}
      <h4>${ie}</h4>
      <seq-placeholder-editor
        .hass=${this.hass}
        .actions=${t}
        .value=${this._placeholders}
        @placeholders-changed=${t=>this._placeholders=t.detail.value}
      ></seq-placeholder-editor>
      ${this._error?W`<div class="error" dir="auto">${this._error}</div>`:F}
      <div class="buttons">
        <button class="close" @click=${()=>this.dispatchEvent(new CustomEvent("closed"))}>${Kt}</button>
        <button class="save" ?disabled=${this._busy} @click=${this._save}>${Jt}</button>
      </div>
    </div>`}};ge.styles=n`
    .form {
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 12px;
      margin: 8px 0;
    }
    label {
      display: block;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin-top: 8px;
    }
    input[type='text'] {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      padding: 6px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    h4 {
      margin: 14px 0 4px;
    }
    .action {
      border-left: 3px solid var(--divider-color);
      padding-left: 8px;
      margin: 8px 0;
    }
    button {
      font: inherit;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      color: var(--primary-text-color);
      padding: 4px 10px;
      cursor: pointer;
    }
    button.save {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }
    .error {
      color: var(--error-color, #c62828);
      margin-top: 8px;
    }
  `,t([pt({attribute:!1})],ge.prototype,"hass",void 0),t([pt({attribute:!1})],ge.prototype,"template",void 0),t([ut()],ge.prototype,"_key",void 0),t([ut()],ge.prototype,"_name",void 0),t([ut()],ge.prototype,"_start",void 0),t([ut()],ge.prototype,"_end",void 0),t([ut()],ge.prototype,"_noEnd",void 0),t([ut()],ge.prototype,"_placeholders",void 0),t([ut()],ge.prototype,"_error",void 0),t([ut()],ge.prototype,"_busy",void 0),ge=t([ht("seq-template-dialog")],ge);let ye=class extends at{constructor(){super(...arguments),this.hass=null,this._templates=null,this._editing=void 0,this._error="",this._loadedFor=null}updated(){this.hass&&this._loadedFor!==this.hass&&null===this._templates&&(this._loadedFor=this.hass,this._load())}async _load(){try{this._templates=await new _t(this.hass).listTemplates()}catch(t){this._error=t?.message??String(t)}}async _delete(t){if(window.confirm(Vt(t.name)))try{await new _t(this.hass).deleteTemplate(t.id),await this._load()}catch(t){this._error=t?.message??String(t)}}_summary(t){const e=t=>t.map(t=>t.action).join(" + ");return t.end.length?`${e(t.start)} → ${e(t.end)}`:e(t.start)}render(){return W`<div class="list">
      ${this._error?W`<div class="error">${this._error}</div>`:F}
      ${void 0!==this._editing?W`<seq-template-dialog
            .hass=${this.hass}
            .template=${this._editing}
            @saved=${async()=>{this._editing=void 0,await this._load()}}
            @closed=${()=>this._editing=void 0}
          ></seq-template-dialog>`:W`<button class="add-template" @click=${()=>this._editing=null}>${Bt}</button>`}
      ${0===this._templates?.length?W`<div class="empty">${le}</div>`:F}
      ${(this._templates??[]).map(t=>W`<div class="template">
          <div class="text">
            <span class="key" dir="auto">${t.key}</span>
            <span class="name" dir="auto">${t.name}</span>
            <div class="summary">${this._summary(t)}</div>
          </div>
          <button class="edit" @click=${()=>this._editing=t}>${Ft}</button>
          <button class="delete" @click=${()=>this._delete(t)}>${Qt}</button>
        </div>`)}
    </div>`}};ye.styles=n`
    .template {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px;
      margin: 6px 0;
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .key {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 600;
    }
    .summary {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      overflow-wrap: anywhere;
    }
    button {
      font: inherit;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      color: var(--primary-text-color);
      padding: 4px 10px;
      cursor: pointer;
    }
    .empty,
    .error {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
  `,t([pt({attribute:!1})],ye.prototype,"hass",void 0),t([ut()],ye.prototype,"_templates",void 0),t([ut()],ye.prototype,"_editing",void 0),t([ut()],ye.prototype,"_error",void 0),ye=t([ht("seq-template-list")],ye);let fe=class extends at{constructor(){super(...arguments),this.hass=null,this._tab="queue"}setConfig(t){}getCardSize(){return 6}static getStubConfig(){return{}}render(){return this.hass?.user&&!1===this.hass.user.is_admin?W`<ha-card .header=${At}><div class="note">${Ct}</div></ha-card>`:W`
      <ha-card .header=${At}>
        <div class="tabs" role="tablist">
          ${this._tabButton("queue",St)} ${this._tabButton("templates",Et)}
        </div>
        <div class="body">
          ${"queue"===this._tab?W`<seq-queue-entry .hass=${this.hass}></seq-queue-entry>
                <seq-queue-list .hass=${this.hass}></seq-queue-list>`:W`<seq-template-list .hass=${this.hass}></seq-template-list>`}
        </div>
      </ha-card>
    `}_tabButton(t,e){return W`<button
      role="tab"
      aria-selected=${this._tab===t?"true":"false"}
      @click=${()=>this._tab=t}
    >
      ${e}
    </button>`}};fe.styles=n`
    .tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px 0;
    }
    .tabs button {
      flex: 1;
      padding: 8px;
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }
    .tabs button[aria-selected='true'] {
      border-bottom-color: var(--primary-color);
      font-weight: 600;
    }
    .body {
      padding: 12px 16px 16px;
    }
    .note {
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `,t([pt({attribute:!1})],fe.prototype,"hass",void 0),t([ut()],fe.prototype,"_tab",void 0),fe=t([ht("sequence-scheduler-card")],fe),window.customCards=window.customCards??[],window.customCards.push({type:"sequence-scheduler-card",name:"Sequence Scheduler",description:"Queue one-off sequences of actions from short text lines."}),console.info("sequence-scheduler-card 0.2.2");export{fe as SequenceSchedulerCard};
