
import {config} from '../modules/config.mjs';

document.querySelector('#optionsHeadingExperimental').textContent = browser.i18n.getMessage('optionsHeadingExperimental');
document.querySelector('#optionsHeadingFirefox').textContent = browser.i18n.getMessage('optionsHeadingFirefox');
document.querySelector('#optionsDescriptionExperimental').textContent = browser.i18n.getMessage('optionsDescriptionExperimental');
document.querySelector('#optionsDescriptionFirefox').textContent = browser.i18n.getMessage('optionsDescriptionFirefox');

const inputNewTabKeepContainer = document.querySelector('#input-newtabKeepContainer');
document.querySelector('label[for="input-newtabKeepContainer"]').textContent = browser.i18n.getMessage('labelNewTabKeepContainer');

const inputFirstPartyIsolate = document.querySelector('#input-firstPartyIsolate');
document.querySelector('label[for="input-firstPartyIsolate"]').textContent = browser.i18n.getMessage('labelFirstPartyIsolate');

const inputResistFingerprinting = document.querySelector('#input-resistFingerprinting');
document.querySelector('label[for="input-resistFingerprinting"]').textContent = browser.i18n.getMessage('labelResistFingerprinting');

const inputDragTabToChangeContainer = document.querySelector('#input-dragTabToChangeContainer');
document.querySelector('label[for="input-dragTabToChangeContainer"]').textContent = browser.i18n.getMessage('labelDragTabToChangeContainer');

config.observe('newtab.keepContainer', (value) => {
    if (undefined === value) {
        config.set('newtab.keepContainer', true);
        return;
    }
    inputNewTabKeepContainer.checked = value;
});

inputNewTabKeepContainer.addEventListener('change', (ev) => {
    config.set('newtab.keepContainer', ev.target.checked)
    .catch(e => console.error(e));
});

config.observe('gesture.dragTabBetweenContainers', (value) => {
    if (undefined === value) {
        config.set('gesture.dragTabBetweenContainers', true);
        return;
    }
    inputDragTabToChangeContainer.checked = value;
});

inputDragTabToChangeContainer.addEventListener('change', (ev) => {
    config.set('gesture.dragTabBetweenContainers', ev.target.checked)
    .catch(e => console.error(e));
});

browser.privacy.websites.firstPartyIsolate.get({}).then((details) => {
    inputFirstPartyIsolate.checked = details.value;
});

browser.privacy.websites.firstPartyIsolate.onChange.addListener((details) => {
    inputFirstPartyIsolate.checked = details.value;
});

inputFirstPartyIsolate.addEventListener('change', (ev) => {
    browser.privacy.websites.firstPartyIsolate.set({
        value: ev.target.checked,
    }).catch((e) => console.error(e));
});

browser.privacy.websites.resistFingerprinting.get({}).then((details) => {
    inputResistFingerprinting.checked = details.value;
});

browser.privacy.websites.resistFingerprinting.onChange.addListener((details) => {
    inputResistFingerprinting.checked = details.value;
});

inputResistFingerprinting.addEventListener('change', (ev) => {
    browser.privacy.websites.resistFingerprinting.set({
        value: ev.target.checked,
    }).catch((e) => console.error(e));
});
