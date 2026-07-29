import { World } from './world.js';

const container = document.querySelector('#scene-container');
const world = new World(container);
world.start();