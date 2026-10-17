import * as THREE_NS from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
window.THREE = Object.assign({}, THREE_NS, {GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass});
// El adaptador de HyperFrames espera a THREE.DefaultLoadingManager: tiene que ser el mismo objeto.
window.THREE.DefaultLoadingManager = THREE_NS.DefaultLoadingManager;
