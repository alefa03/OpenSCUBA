import { World } from './world.js';
import { LoadingUI } from '../ui/loading_ui.js';

const container = document.querySelector('#scene-container');
const world = new World(container);
const loading_ui = new LoadingUI(world);

world.start();