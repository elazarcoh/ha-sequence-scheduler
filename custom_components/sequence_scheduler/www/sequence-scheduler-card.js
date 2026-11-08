function t(t,e,s,i){var r,n=arguments.length,o=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(o=(n<3?r(o):n>3?r(e,s,o):r(e,s))||o);return n>3&&o&&Object.defineProperty(e,s,o),o}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),r=new WeakMap;let n=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&r.set(e,t))}return t}toString(){return this.cssText}};const o=(t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new n(s,t,i)},a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:h,defineProperty:l,getOwnPropertyDescriptor:c,getOwnPropertyNames:d,getOwnPropertySymbols:u,getPrototypeOf:p}=Object,_=globalThis,$=_.trustedTypes,m=$?$.emptyScript:"",f=_.reactiveElementPolyfillSupport,y=(t,e)=>t,g={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},v=(t,e)=>!h(t,e),b={attribute:!0,type:String,converter:g,reflect:!1,useDefault:!1,hasChanged:v};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let A=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=b){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&l(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:r}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const n=i?.call(this);r?.call(this,e),this.requestUpdate(t,n,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const t=this.properties,e=[...d(t),...u(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),r=e.litNonce;void 0!==r&&i.setAttribute("nonce",r),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const r=(void 0!==s.converter?.toAttribute?s.converter:g).toAttribute(e,s.type);this._$Em=t,null==r?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:g;this._$Em=i;const n=r.fromAttribute(e,t.type);this[i]=n??this._$Ej?.get(i)??n,this._$Em=null}}requestUpdate(t,e,s,i=!1,r){if(void 0!==t){const n=this.constructor;if(!1===i&&(r=this[t]),s??=n.getPropertyOptions(t),!((s.hasChanged??v)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:r},n){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==r||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[y("elementProperties")]=new Map,A[y("finalized")]=new Map,f?.({ReactiveElement:A}),(_.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const w=globalThis,x=t=>t,S=w.trustedTypes,E=S?S.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,q="?"+P,k=`<${q}>`,O=document,T=()=>O.createComment(""),U=t=>null===t||"object"!=typeof t&&"function"!=typeof t,H=Array.isArray,M="[ \t\n\f\r]",R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,N=/-->/g,j=/>/g,L=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,D=/"/g,I=/^(?:script|style|textarea|title)$/i,B=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),W=Symbol.for("lit-noChange"),V=Symbol.for("lit-nothing"),F=new WeakMap,Q=O.createTreeWalker(O,129);function Z(t,e){if(!H(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(e):e}const J=(t,e)=>{const s=t.length-1,i=[];let r,n=2===e?"<svg>":3===e?"<math>":"",o=R;for(let e=0;e<s;e++){const s=t[e];let a,h,l=-1,c=0;for(;c<s.length&&(o.lastIndex=c,h=o.exec(s),null!==h);)c=o.lastIndex,o===R?"!--"===h[1]?o=N:void 0!==h[1]?o=j:void 0!==h[2]?(I.test(h[2])&&(r=RegExp("</"+h[2],"g")),o=L):void 0!==h[3]&&(o=L):o===L?">"===h[0]?(o=r??R,l=-1):void 0===h[1]?l=-2:(l=o.lastIndex-h[2].length,a=h[1],o=void 0===h[3]?L:'"'===h[3]?D:z):o===D||o===z?o=L:o===N||o===j?o=R:(o=L,r=void 0);const d=o===L&&t[e+1].startsWith("/>")?" ":"";n+=o===R?s+k:l>=0?(i.push(a),s.slice(0,l)+C+s.slice(l)+P+d):s+P+(-2===l?e:d)}return[Z(t,n+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};let K=class t{constructor({strings:e,_$litType$:s},i){let r;this.parts=[];let n=0,o=0;const a=e.length-1,h=this.parts,[l,c]=J(e,s);if(this.el=t.createElement(l,i),Q.currentNode=this.el.content,2===s||3===s){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(r=Q.nextNode())&&h.length<a;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(C)){const e=c[o++],s=r.getAttribute(t).split(P),i=/([.?@])?(.*)/.exec(e);h.push({type:1,index:n,name:i[2],strings:s,ctor:"."===i[1]?et:"?"===i[1]?st:"@"===i[1]?it:tt}),r.removeAttribute(t)}else t.startsWith(P)&&(h.push({type:6,index:n}),r.removeAttribute(t));if(I.test(r.tagName)){const t=r.textContent.split(P),e=t.length-1;if(e>0){r.textContent=S?S.emptyScript:"";for(let s=0;s<e;s++)r.append(t[s],T()),Q.nextNode(),h.push({type:2,index:++n});r.append(t[e],T())}}}else if(8===r.nodeType)if(r.data===q)h.push({type:2,index:n});else{let t=-1;for(;-1!==(t=r.data.indexOf(P,t+1));)h.push({type:7,index:n}),t+=P.length-1}n++}}static createElement(t,e){const s=O.createElement("template");return s.innerHTML=t,s}};function G(t,e,s=t,i){if(e===W)return e;let r=void 0!==i?s._$Co?.[i]:s._$Cl;const n=U(e)?void 0:e._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),void 0===n?r=void 0:(r=new n(t),r._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=r:s._$Cl=r),void 0!==r&&(e=G(t,r._$AS(t,e.values),r,i)),e}class X{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??O).importNode(e,!0);Q.currentNode=i;let r=Q.nextNode(),n=0,o=0,a=s[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new Y(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new rt(r,this,t)),this._$AV.push(e),a=s[++o]}n!==a?.index&&(r=Q.nextNode(),n++)}return Q.currentNode=O,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Y{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=V,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=G(this,t,e),U(t)?t===V||null==t||""===t?(this._$AH!==V&&this._$AR(),this._$AH=V):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>H(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==V&&U(this._$AH)?this._$AA.nextSibling.data=t:this.T(O.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=K.createElement(Z(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new X(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=F.get(t.strings);return void 0===e&&F.set(t.strings,e=new K(t)),e}k(t){H(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const r of t)i===e.length?e.push(s=new Y(this.O(T()),this.O(T()),this,this.options)):s=e[i],s._$AI(r),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=x(t).nextSibling;x(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,r){this.type=1,this._$AH=V,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=r,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=V}_$AI(t,e=this,s,i){const r=this.strings;let n=!1;if(void 0===r)t=G(this,t,e,0),n=!U(t)||t!==this._$AH&&t!==W,n&&(this._$AH=t);else{const i=t;let o,a;for(t=r[0],o=0;o<r.length-1;o++)a=G(this,i[s+o],e,o),a===W&&(a=this._$AH[o]),n||=!U(a)||a!==this._$AH[o],a===V?t=V:t!==V&&(t+=(a??"")+r[o+1]),this._$AH[o]=a}n&&!i&&this.j(t)}j(t){t===V?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===V?void 0:t}}class st extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==V)}}class it extends tt{constructor(t,e,s,i,r){super(t,e,s,i,r),this.type=5}_$AI(t,e=this){if((t=G(this,t,e,0)??V)===W)return;const s=this._$AH,i=t===V&&s!==V||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==V&&(s===V||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){G(this,t)}}const nt=w.litHtmlPolyfillSupport;nt?.(K,Y),(w.litHtmlVersions??=[]).push("3.3.3");const ot=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class at extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let r=i._$litPart$;if(void 0===r){const t=s?.renderBefore??null;i._$litPart$=r=new Y(e.insertBefore(T(),t),t,void 0,s??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}at._$litElement$=!0,at.finalized=!0,ot.litElementHydrateSupport?.({LitElement:at});const ht=ot.litElementPolyfillSupport;ht?.({LitElement:at}),(ot.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const lt=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},ct={attribute:!0,type:String,converter:g,reflect:!1,hasChanged:v},dt=(t=ct,e,s)=>{const{kind:i,metadata:r}=s;let n=globalThis.litPropertyMetadata.get(r);if(void 0===n&&globalThis.litPropertyMetadata.set(r,n=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),n.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const r=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,r,t,!0,s)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const r=this[i];e.call(this,s),this.requestUpdate(i,r,t,!0,s)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ut(t){return(e,s)=>"object"==typeof s?dt(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ut({...t,state:!0,attribute:!1})}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class _t{constructor(t){this.hass=t}async listTemplates(){return(await this.hass.callWS({type:"sequence_scheduler/templates/list"})).templates}async saveTemplate(t){return(await this.hass.callWS({type:"sequence_scheduler/templates/save",template:t})).template}async deleteTemplate(t){await this.hass.callWS({type:"sequence_scheduler/templates/delete",template_id:t})}preview(t){return this.hass.callWS({type:"sequence_scheduler/preview",text:t})}queue(t,e,s){return this.hass.callWS({type:"sequence_scheduler/queue",text:t,now:e,token:s})}async cancel(t,e){await this.hass.callWS({type:"sequence_scheduler/queue/cancel",block_id:t,run_end:e})}subscribeQueue(t){return this.hass.connection.subscribeMessage(e=>t(e.blocks),{type:"sequence_scheduler/queue/subscribe"})}}function $t(t,e){const s=new Intl.DateTimeFormat("en-GB",{timeZone:e,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}),i=Object.fromEntries(s.formatToParts(new Date(t)).map(t=>[t.type,t.value]));return{day:`${i.year}-${i.month}-${i.day}`,time:`${i.hour}:${i.minute}`}}function mt(t,e){return $t(t,e).time}const ft=/^([01]?\d|2[0-3]):([0-5]\d)$/,yt=[/^\d+(\.\d+)?h$/i,/^\d+m$/i,/^\d+h\d{1,2}m?$/i];function gt(t){const e=t.resolved_options??t.options,s=String(t.default);return e&&e.length?`${t.key} (${s}: ${e.join(" / ")})`:`${t.key} (${s})`}function vt(t,e){const s=t.trimStart();if(!s||s.startsWith("#"))return null;const i=s.split(/\s+/).filter(Boolean),r=1===i.length&&!/\s$/.test(s),n=i[0].toLocaleLowerCase();if(r){const t=e.map(t=>t.key).filter(t=>t.toLocaleLowerCase().startsWith(n));return t.length?t.join(" · "):"unknown template"}const o=e.find(t=>t.key.toLocaleLowerCase()===n);if(!o)return"unknown template";if(i.length<2||!ft.test(i[1]))return null;let a=i.slice(2);var h;a.length&&(h=a[0],yt.some(t=>t.test(h)))&&(a=a.slice(1));const l=new Set(a.filter(t=>t.includes("=")).map(t=>t.split("=",1)[0].toLocaleLowerCase())),c=a.filter(t=>!t.includes("=")).length,d=o.placeholders.filter((t,e)=>e>=c&&!l.has(t.key.toLocaleLowerCase()));return d.length?d.map(gt).join(" · "):null}const bt="Sequence Scheduler",At="Queue",wt="Templates",xt="Only an administrator can use the Sequence Scheduler.",St=t=>`Queue ${t}`,Et=t=>`fix ${t}`,Ct=t=>`Queued ${t}`,Pt="Something changed. Check the list and queue again.";let qt=class extends at{constructor(){super(...arguments),this.hass=null,this._text="",this._preview=null,this._templates=[],this._hint=null,this._message="",this._busy=!1,this._timer=null,this._seq=0,this._loadedFor=null}firstUpdated(){this._textarea.addEventListener("input",t=>this._onInput(t)),this._textarea.addEventListener("click",()=>this._updateHint()),this._textarea.addEventListener("keyup",()=>this._updateHint())}updated(){this.hass&&this._loadedFor!==this.hass&&0===this._templates.length&&(this._loadedFor=this.hass,this._loadTemplates())}disconnectedCallback(){super.disconnectedCallback(),this._timer&&clearTimeout(this._timer)}async _loadTemplates(){try{this._templates=await new _t(this.hass).listTemplates(),this._updateHint()}catch{}}_onInput(t){this._text=t.target.value,this._message="",this._updateHint(),this._timer&&clearTimeout(this._timer),this._timer=setTimeout(()=>this._runPreview(),300)}_updateHint(){const t=this._textarea,e=t?.selectionStart??this._text.length,s=this._text.slice(0,e).lastIndexOf("\n")+1,i=this._text.indexOf("\n",e),r=this._text.slice(s,-1===i?void 0:i);this._hint=vt(r,this._templates)}async _runPreview(){this._timer=null;const t=++this._seq;if(this._text.trim())try{const e=await new _t(this.hass).preview(this._text);t===this._seq&&(this._preview=e)}catch(e){t===this._seq&&(this._message=e?.message??String(e))}else this._preview=null}get _counts(){const t=this._preview?.rows??[];return{ok:t.filter(t=>t.ok).length,bad:t.filter(t=>!t.ok).length}}async _queue(){const t=this._preview;if(t&&!this._busy){this._busy=!0;try{const{queued:e}=await new _t(this.hass).queue(this._text,t.now,t.token);this._text="",this._preview=null,this._hint=null,this._textarea&&(this._textarea.value=""),this._message=Ct(e)}catch(t){"preview_changed"===t?.code?(await this._runPreview(),this._message=Pt):this._message=t?.message??String(t)}finally{this._busy=!1}}}_row(t){const e=this.hass?.config?.time_zone,s=this._preview.now,i=t.start_at?t.end_at?`${mt(t.start_at,e)}–${mt(t.end_at,e)}`:mt(t.start_at,e):"--:--";return B`<div class="row">
      <span class="time" dir="ltr">${i}</span>
      ${t.start_at?B`<span class="day">${function(t,e,s){const i=$t(t,s).day;return i===$t(e,s).day?"today":i===$t(new Date(new Date(e).getTime()+864e5).toISOString(),s).day?"tomorrow":i}(t.start_at,s,e)}</span>`:V}
      <span class="name" dir="auto">${t.template_name??t.raw}</span>
      <span class="values" dir="auto">${r=t.values,Object.values(r).map(String).join(" · ")}</span>
      ${t.ok?B`<span class="ok">✓</span>`:V}
      ${t.errors.map(t=>B`<span class="error" dir="auto">${t.detail}</span>`)}
      ${t.warnings.map(t=>B`<span class="warning" dir="auto">${t.detail}</span>`)}
    </div>`;var r}render(){const{ok:t,bad:e}=this._counts,s=e?`${St(t)} · ${Et(e)}`:St(t);return B`
      <!-- No Lit bindings on the textarea: listeners are attached in
           firstUpdated and the value is read and cleared on the element. -->
      <textarea dir="auto" spellcheck="false" autocapitalize="off" placeholder="kids 01:00 1h 25"></textarea>
      <div class="hint" dir="auto">${this._hint??""}</div>
      <div class="rows">${this._preview?this._preview.rows.map(t=>this._row(t)):V}</div>
      <div class="actions">
        <span class="message">${this._message}</span>
        <button class="queue" ?disabled=${0===t||this._busy} @click=${this._queue}>${s}</button>
      </div>
    `}};qt.styles=o`
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
  `,t([ut({attribute:!1})],qt.prototype,"hass",void 0),t([pt()],qt.prototype,"_text",void 0),t([pt()],qt.prototype,"_preview",void 0),t([pt()],qt.prototype,"_templates",void 0),t([pt()],qt.prototype,"_hint",void 0),t([pt()],qt.prototype,"_message",void 0),t([pt()],qt.prototype,"_busy",void 0),t([
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function(t){return(e,s,i)=>((t,e,s)=>(s.configurable=!0,s.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,s),s))(e,s,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}("textarea")],qt.prototype,"_textarea",void 0),qt=t([lt("seq-queue-entry")],qt);let kt=class extends at{constructor(){super(...arguments),this.hass=null}render(){return B``}};t([ut({attribute:!1})],kt.prototype,"hass",void 0),kt=t([lt("seq-queue-list")],kt);let Ot=class extends at{constructor(){super(...arguments),this.hass=null}render(){return B``}};t([ut({attribute:!1})],Ot.prototype,"hass",void 0),Ot=t([lt("seq-template-list")],Ot);let Tt=class extends at{constructor(){super(...arguments),this.hass=null,this._tab="queue"}setConfig(t){}getCardSize(){return 6}static getStubConfig(){return{}}render(){return this.hass?.user&&!1===this.hass.user.is_admin?B`<ha-card .header=${bt}><div class="note">${xt}</div></ha-card>`:B`
      <ha-card .header=${bt}>
        <div class="tabs" role="tablist">
          ${this._tabButton("queue",At)} ${this._tabButton("templates",wt)}
        </div>
        <div class="body">
          ${"queue"===this._tab?B`<seq-queue-entry .hass=${this.hass}></seq-queue-entry>
                <seq-queue-list .hass=${this.hass}></seq-queue-list>`:B`<seq-template-list .hass=${this.hass}></seq-template-list>`}
        </div>
      </ha-card>
    `}_tabButton(t,e){return B`<button
      role="tab"
      aria-selected=${this._tab===t?"true":"false"}
      @click=${()=>this._tab=t}
    >
      ${e}
    </button>`}};Tt.styles=o`
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
  `,t([ut({attribute:!1})],Tt.prototype,"hass",void 0),t([pt()],Tt.prototype,"_tab",void 0),Tt=t([lt("sequence-scheduler-card")],Tt),window.customCards=window.customCards??[],window.customCards.push({type:"sequence-scheduler-card",name:"Sequence Scheduler",description:"Queue one-off sequences of actions from short text lines."}),console.info("sequence-scheduler-card 0.1.0");export{Tt as SequenceSchedulerCard};
