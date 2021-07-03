// vim: ts=4 noet ai

import * as containers from '../modules/containers.mjs';
import {sleep} from '../modules/utils.mjs';

const STATE_NO_TABS = 0;
const STATE_HIDDEN_TABS = 1;
const STATE_VISIBLE_TABS = 2;

const renderTab = async (tab) => {
	const tabElement = document.createElement('li');
	tabElement.title = tab.url;
	tabElement.classList.add('tab');
	const tabPinButton = document.createElement('button');
	tabPinButton.classList.add('tab-pin-button');
	tabElement.append(tabPinButton);
	tabPinButton.addEventListener('click', async (ev) => {
		ev.stopImmediatePropagation();
		if (tab.pinned) {
			await browser.tabs.update(tab.id, {
				pinned: false,
			});
			await sleep(.5);
			await render();
		} else {
			await browser.tabs.update(tab.id, {
				pinned: true,
			});
			await sleep(.5);
			await render();
		}
	});
	const tabIconElement = document.createElement('img');
	tabIconElement.src = tab.favIconUrl;
	tabIconElement.classList.add('tab-icon');
	tabIconElement.addEventListener('error', ev => {
		ev.target.classList.add('img-error');
		ev.target.src = '/img/transparent.png';
	});
	tabElement.append(tabIconElement);
	const tabLabelElement = document.createElement('div');
	tabLabelElement.classList.add('tab-label');
	tabElement.append(tabLabelElement);
	tabLabelElement.textContent = tab.title;
	const tabCloseButton = document.createElement('button');
	tabCloseButton.classList.add('tab-close-button');
	tabCloseButton.title = 'Close this tab';
	tabElement.append(tabCloseButton);
	tabCloseButton.addEventListener('click', async (ev) => {
		ev.stopImmediatePropagation();
		await browser.tabs.remove(tab.id);
		await sleep(.5);
		await render();
	});
	if (tab.pinned) {
		tabElement.classList.add('tab-pinned');
	} else if (tab.hidden) {
		tabElement.classList.add('tab-hidden');
	} else {
		tabElement.classList.add('tab-visible');
	}

	tabElement.addEventListener('click', async (ev) => {
		await browser.tabs.update(tab.id, {
			active: true,
		});
		window.close();
	});

	const container = await containers.get(tab.cookieStoreId);
	if (container) {
		tabElement.style.borderColor = container.colorCode;
	}
	return tabElement;
};

const renderContainer = async (containerId) => {
	const containerIds = await containers.getIds();
	const container = containerId ? (await containers.get(containerId)) : {
		name: 'No container',
	};
	const tabs = await browser.tabs.query({windowId: browser.windows.WINDOW_ID_CURRENT});
	const containerElement = document.createElement('li');
	containerElement.classList.add('container');
	const containerIcon = document.createElement('img');
	containerIcon.src = container.iconUrl || 'about:blank';
	containerIcon.style.fill = container.colorCode; // FIXME
	containerIcon.classList.add('container-icon');
	containerIcon.addEventListener('error', ev => {
		ev.target.classList.add('img-error');
		ev.target.src = '/img/transparent.png';
	});
	containerElement.append(containerIcon);
	const containerLabel = document.createElement('div');
	containerElement.append(containerLabel);
	containerLabel.classList.add('container-label');
	containerLabel.textContent = container.name;
	const newTabButton = document.createElement('button');
	newTabButton.classList.add('new-tab-button');
	containerElement.append(newTabButton);
	newTabButton.title = 'Open a new tab with this container';
	newTabButton.addEventListener('click', async (ev) => {
		ev.stopImmediatePropagation();
		await browser.tabs.create({
			active: true,
			windowId: browser.windows.WINDOW_ID_CURRENT,
			cookieStoreId: containerId,
		});
		await sleep(.5);
		await render();
	});
	const tabListElement = document.createElement('ul');
	tabListElement.classList.add('container-tabs');
	containerElement.append(tabListElement);
	let containerState = STATE_NO_TABS;
	for (const tab of tabs) {
		if (tab.pinned) continue;
		if (containerId) {
			if (tab.cookieStoreId != containerId) continue;
		} else {
			if (containerIds.includes(tab.cookieStoreId)) continue;
		}
		
		const tabElement = await renderTab(tab);
		tabListElement.append(tabElement);
		if (tab.hidden) {
			containerState = STATE_HIDDEN_TABS;
		} else {
			containerState = STATE_VISIBLE_TABS;
		}
	}
	switch (containerState) {
		case STATE_HIDDEN_TABS:
			containerElement.classList.add('container-hidden');
			break;

		case STATE_VISIBLE_TABS:
			containerElement.classList.add('container-visible');
	}
	return containerElement;
};

const render = async () => {
	const menuListElement = document.querySelector('#menuList');
	menuListElement.textContent = '';

	const currentWindow = await browser.windows.getCurrent();
	const windowId = currentWindow.id;

	const tabs = await browser.tabs.query({windowId: windowId});

	for (const tab of tabs) {
		if (!tab.pinned) continue;
		const tabElement = await renderTab(tab);
		menuListElement.append(tabElement);
	}
	
	const containerIds = await containers.getIds();
	for (const containerId of [null, ... containerIds]) {
		const containerElement = await renderContainer(containerId);
		menuListElement.append(containerElement);
	}

};

render().catch(e => console.error(e));
