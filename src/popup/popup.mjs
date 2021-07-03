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
	tabPinButton.title = 'Pin or unpin this tab';
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

	const userContextId = containers.toUserContextId(tab.cookieStoreId);
	const container = await containers.get(userContextId);
	if (container) {
		tabElement.style.borderColor = container.colorCode;
	}
	return tabElement;
};

const renderContainer = async (userContextId) => {
	const cookieStoreId = containers.toCookieStoreId(userContextId);
	const container = await containers.get(userContextId);
	const tabs = await browser.tabs.query({windowId: browser.windows.WINDOW_ID_CURRENT});
	const windowId = (await browser.windows.getCurrent()).id;
	const containerElement = document.createElement('li');
	containerElement.classList.add('container');
	if (!userContextId) {
		containerElement.classList.add('container-default');
	}
	const visibilityToggleButton = document.createElement('button');
	visibilityToggleButton.classList.add('container-visibility-toggle');
	containerElement.append(visibilityToggleButton);
	visibilityToggleButton.title = 'Toggle visibility of the container';
	visibilityToggleButton.addEventListener('click', async (ev) => {
		if (containerElement.classList.contains('container-hidden')) {
			await containers.show(userContextId, windowId);
		} else if (containerElement.classList.contains('container-visible')) {
			await containers.hide(userContextId, windowId);
		}
		await render();
	});
	const newTabHandler = async (ev) => {
		await browser.tabs.create({
			active: true,
			windowId: browser.windows.WINDOW_ID_CURRENT,
			cookieStoreId,
		});
		await sleep(.5);
		await render();
	};
	const containerIcon = document.createElement('div');
	const iconUrl = container.iconUrl || '/img/category_black_24dp.svg';
	containerIcon.style.mask = `url(${iconUrl}) center center/contain no-repeat`;
	containerIcon.style.backgroundColor = container.colorCode || '#000';
	containerIcon.classList.add('container-icon');
	containerElement.append(containerIcon);
	containerIcon.addEventListener('click', newTabHandler);
	const containerLabel = document.createElement('div');
	containerElement.append(containerLabel);
	containerLabel.classList.add('container-label');
	containerLabel.textContent = container.name;
	containerLabel.addEventListener('click', newTabHandler);
	const deleteContainerButton = document.createElement('button');
	deleteContainerButton.classList.add('delete-container-button');
	containerElement.append(deleteContainerButton);
	if (!userContextId) {
		deleteContainerButton.title = 'Close all tabs in this container';
		deleteContainerButton.addEventListener('click', async (ev) => {
			if (!await confirmAsync('Do you want to close all tabs in this container: ' + container.name + '?')) return;
			await containers.remove(userContextId);
			await sleep(.5);
			await render();
		});
	} else {
		deleteContainerButton.title = 'Permanently delete this container';
		deleteContainerButton.addEventListener('click', async (ev) => {
			if (!await confirmAsync('Do you want to permanently delete this container: ' + container.name + '?')) return;
			await containers.remove(userContextId);
			await sleep(.5);
			await render();
		});
	}
	const tabListElement = document.createElement('ul');
	tabListElement.classList.add('container-tabs');
	containerElement.append(tabListElement);
	let containerState = STATE_NO_TABS;
	for (const tab of tabs) {
		if (tab.pinned) continue;
		if (tab.cookieStoreId != cookieStoreId) continue;
		
		if (tab.hidden) {
			containerState = STATE_HIDDEN_TABS;
		} else {
			containerState = STATE_VISIBLE_TABS;
			const tabElement = await renderTab(tab);
			tabListElement.append(tabElement);
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

globalThis.render = async () => {
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
	
	const userContextIds = await containers.getIds();
	for (const userContextId of [0, ... userContextIds]) {
		const containerElement = await renderContainer(userContextId);
		menuListElement.append(containerElement);
	}

};

globalThis.confirmAsync = (msg) => {
	const confirmMessageElement = document.querySelector('#confirm-message');
	confirmMessageElement.textContent = msg ? String(msg) : '';
	const cancelButton = document.querySelector('#confirm-cancel-button');
	const okButton = document.querySelector('#confirm-ok-button');
	location.hash = '#confirm';
	return new Promise((res) => {
		cancelButton.addEventListener('click', function cancel(ev) {
			ev.target.removeEventListener('click', cancel);
			location.hash = '';
			res(false);
		});
		okButton.addEventListener('click', function ok(ev) {
			ev.target.removeEventListener('click', ok);
			location.hash = '';
			res(true);
		});
	});
};

globalThis.showNewContainerPane = async () => {
	const cancelButton = document.querySelector('#new-container-cancel-button');
	const okButton = document.querySelector('#new-container-ok-button');
	const nameElement = document.querySelector('#new-container-name');
	const iconElement = document.querySelector('#new-container-icon');
	const colorElement = document.querySelector('#new-container-color');
	location.hash = '#new-container';
	if (!await new Promise((res) => {
		cancelButton.addEventListener('click', function cancel(ev) {
			ev.target.removeEventListener('click', cancel);
			location.hash = '';
			res(false);
		});
		okButton.addEventListener('click', function ok(ev) {
			ev.target.removeEventListener('click', ok);
			location.hash = '';
			res(true);
		});
	})) {
		return;
	}
	//
	const name = nameElement.value;
	const icon = iconElement.value;
	const color = colorElement.value;
	await containers.create(name, color, icon);
	await sleep(.5);
	await render();
};

document.querySelector('#button-new-container').addEventListener('click', ev => showNewContainerPane());

document.querySelector('#button-hide-inactive').addEventListener('click', async (ev) => {
	await containers.hideAll(browser.windows.WINDOW_ID_CURRENT);
	await render();
});

render().catch(e => console.error(e));
