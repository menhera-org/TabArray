// vim: ts=4 noet ai

import * as containers from '../modules/containers.mjs';
import { toUserContextId } from '../modules/containers.mjs';
import {sleep} from '../modules/utils.mjs';
import {WebExtensionsBroadcastChannel} from '../modules/broadcasting.mjs';
import '/components/usercontext-colorpicker.mjs';
import '/components/usercontext-iconpicker.mjs';

const STATE_NO_TABS = 0;
const STATE_HIDDEN_TABS = 1;
const STATE_VISIBLE_TABS = 2;

document.title = browser.i18n.getMessage('browserActionPopupTitle');
document.querySelector('#button-hide-inactive').textContent = browser.i18n.getMessage('buttonHideInactiveContainers');
document.querySelector('#button-new-container').textContent = browser.i18n.getMessage('buttonNewContainer');
document.querySelector('#confirm-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
document.querySelector('#confirm-ok-button').textContent = browser.i18n.getMessage('buttonOk');
document.querySelector('#new-container-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
document.querySelector('#new-container-ok-button').textContent = browser.i18n.getMessage('buttonOk');
document.querySelector('label[for="new-container-name"]').textContent = browser.i18n.getMessage('newContainerNameLabel');
document.querySelector('#new-container-name').placeholder = browser.i18n.getMessage('newContainerNamePlaceholder');

const renderTab = async (tab) => {
	const windowId = (await browser.windows.getCurrent()).id;
	const tabElement = document.createElement('li');
	tabElement.title = tab.url;
	tabElement.classList.add('tab');
	const tabPinButton = document.createElement('button');
	tabPinButton.classList.add('tab-pin-button');
	if (tab.pinned) {
		tabPinButton.title = browser.i18n.getMessage('tooltipTabUnpinButton');
	} else {
		tabPinButton.title = browser.i18n.getMessage('tooltipTabPinButton');
	}
	tabElement.append(tabPinButton);
	tabPinButton.addEventListener('click', async (ev) => {
		ev.stopImmediatePropagation();
		if (tab.pinned) {
			await browser.tabs.update(tab.id, {
				pinned: false,
			});
		} else {
			await browser.tabs.update(tab.id, {
				pinned: true,
			});
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
		await render();
	});
	if (tab.pinned) {
		tabElement.classList.add('tab-pinned');
	} else if (tab.hidden) {
		tabElement.classList.add('tab-hidden');
	} else {
		tabElement.classList.add('tab-visible');
	}
	if (tab.discarded) {
		tabElement.classList.add('tab-discarded');
	}
	if (tab.active) {
		tabElement.classList.add('tab-active');
	}

	tabElement.addEventListener('click', async (ev) => {
		await browser.tabs.update(tab.id, {
			active: true,
		});
		if (windowId != tab.windowId) {
			await browser.windows.update(tab.windowId, {
				focused: true,
			});
		}
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
	visibilityToggleButton.addEventListener('click', async (ev) => {
		if (containerElement.classList.contains('container-hidden')) {
			await containers.show(userContextId, windowId);
		} else if (containerElement.classList.contains('container-visible')) {
			await containers.hide(userContextId, windowId);
		}
		await render();
	});
	const newTabHandler = async (ev) => {
		await containers.openNewTabInContainer(userContextId, windowId);
		window.close();
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
	const editContainerButton = document.createElement('button');
	editContainerButton.classList.add('edit-container-button');
	editContainerButton.title = browser.i18n.getMessage('tooltipEditContainerButton');
	containerElement.append(editContainerButton);
	editContainerButton.addEventListener('click', (ev) => {
		showEditContainerPane(userContextId);
	});
	const closeContainerButton = document.createElement('button');
	containerElement.append(closeContainerButton);
	closeContainerButton.classList.add('close-container-button');
	closeContainerButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
	closeContainerButton.addEventListener('click', async (ev) => {
		await containers.closeAllTabs(userContextId);
		await render();
	});
	if (!userContextId) {
		editContainerButton.disabled = true;
	} else {
		const deleteContainerButton = document.createElement('button');
		containerElement.append(deleteContainerButton);
		deleteContainerButton.title = browser.i18n.getMessage('tooltipContainerDelete');
		deleteContainerButton.classList.add('delete-container-button');
		deleteContainerButton.addEventListener('click', async (ev) => {
			if (!await confirmAsync(browser.i18n.getMessage('confirmContainerDelete', container.name))) return;
			await containers.remove(userContextId);
			await render();
		});
	}
	const tabListElement = document.createElement('ul');
	tabListElement.classList.add('container-tabs');
	containerElement.append(tabListElement);
	let containerState = STATE_NO_TABS;
	let tabCount = 0;
	for (const tab of tabs) {
		if (tab.pinned) continue;
		if (tab.cookieStoreId != cookieStoreId) continue;
		tabCount++;
		if (tab.hidden) {
			containerState = STATE_HIDDEN_TABS;
		} else {
			containerState = STATE_VISIBLE_TABS;
			const tabElement = await renderTab(tab);
			tabListElement.append(tabElement);
		}
	}
	containerLabel.dataset.tabCount = tabCount;
	containerElement.title = browser.i18n.getMessage('defaultContainerName', userContextId);
	switch (containerState) {
		case STATE_HIDDEN_TABS:
			containerElement.classList.add('container-hidden');
			visibilityToggleButton.title = browser.i18n.getMessage('tooltipUnhideContainerButton');
			break;

		case STATE_VISIBLE_TABS:
			containerElement.classList.add('container-visible');
			visibilityToggleButton.title = browser.i18n.getMessage('tooltipHideContainerButton');
			break;
	}
	return containerElement;
};

let rendering = false;
let shouldRerender = false;
globalThis.render = async () => {
	if (rendering) {
		shouldRerender = true;
		return;
	}
	rendering = true;
	try {
		const menuListElement = document.querySelector('#menuList');
		menuListElement.textContent = '';

		const currentWindow = await browser.windows.getCurrent();
		const windowId = currentWindow.id;

		const currentWindowLabel = document.createElement('li');
		menuListElement.append(currentWindowLabel);
		currentWindowLabel.classList.add('window-label');
		currentWindowLabel.textContent = browser.i18n.getMessage('currentWindow', windowId);

		const tabs = await browser.tabs.query({windowId: windowId});
		const windowTabCount = tabs.length;
		currentWindowLabel.dataset.tabCount = windowTabCount;

		const openUserContextIdSet = new Set;
		for (const tab of tabs) {
			if (!tab.pinned) {
				openUserContextIdSet.add(toUserContextId(tab.cookieStoreId));
				continue;
			}
			const tabElement = await renderTab(tab);
			menuListElement.append(tabElement);
		}
		
		const userContextIds = [0, ... await containers.getIds()];
		const openUserContextIds = userContextIds.filter(userContextId => openUserContextIdSet.has(userContextId));
		const availableUserContextIds = userContextIds.filter(userContextId => !openUserContextIdSet.has(userContextId));
		for (const userContextId of openUserContextIds) {
			const containerElement = await renderContainer(userContextId);
			menuListElement.append(containerElement);
		}

		const moreContainersLabel = document.createElement('li');
		menuListElement.append(moreContainersLabel);
		moreContainersLabel.classList.add('window-label');
		moreContainersLabel.textContent = browser.i18n.getMessage('currentWindowMoreContainers');

		for (const userContextId of availableUserContextIds) {
			const containerElement = await renderContainer(userContextId);
			menuListElement.append(containerElement);
		}

		const windows = await browser.windows.getAll({
			windowTypes: ['normal'],
		});
		for (const window of windows) {
			if (window.id == windowId) continue;
			const windowLabel = document.createElement('li');
			menuListElement.append(windowLabel);
			windowLabel.classList.add('window-label');
			windowLabel.textContent = browser.i18n.getMessage('windowLabel', window.id);
			windowLabel.title = browser.i18n.getMessage('tooltipWindowLabel', window.id);
			const targetWindowId = window.id;
			windowLabel.addEventListener('click', (ev) => {
				browser.windows.update(targetWindowId, {
					focused: true,
				}).catch(e => console.error(e));
			});
			const tabs = await browser.tabs.query({
				windowId: window.id,
			});
			windowLabel.dataset.tabCount = tabs.length;
			for (const tab of tabs) {
				if (!tab.active) continue;
				const tabElement = await renderTab(tab);
				menuListElement.append(tabElement);
			}
		}
	} finally {
		rendering = false;
		if (shouldRerender) {
			shouldRerender = false;
			setTimeout(() => {
				render();
			}, 0);
		}
	}
};

globalThis.confirmAsync = (msg) => {
	const confirmMessageElement = document.querySelector('#confirm-message');
	confirmMessageElement.textContent = msg ? String(msg) : '';
	const cancelButton = document.querySelector('#confirm-cancel-button');
	const okButton = document.querySelector('#confirm-ok-button');
	location.hash = '#confirm';
	return new Promise((res) => {
		const cancelHandler = (ev) => {
			cleanUp();
			res(false);
		};
		const okHandler = (ev) => {
			cleanUp();
			res(true);
		};
		const keyHandler = (ev) => {
			if (ev.key == 'Enter') {
				ev.preventDefault();
				okHandler();
			}
			if (ev.key == 'Escape') {
				ev.preventDefault();
				cancelHandler();
			}
		};
		const cleanUp = () => {
			location.hash = '';
			cancelButton.removeEventListener('click', cancelHandler);
			okButton.removeEventListener('click', okHandler);
			document.removeEventListener('keydown', keyHandler);
		};
		cancelButton.addEventListener('click', cancelHandler);
		okButton.addEventListener('click', okHandler);
		document.addEventListener('keydown', keyHandler, true);
	});
};

globalThis.showNewContainerPane = async () => {
	const cancelButton = document.querySelector('#new-container-cancel-button');
	const okButton = document.querySelector('#new-container-ok-button');
	const nameElement = document.querySelector('#new-container-name');
	const iconElement = document.querySelector('#new-container-icon');
	const colorElement = document.querySelector('#new-container-color');
	let name = nameElement.value;
	let icon = iconElement.value;
	let color = colorElement.value;
	document.querySelector('#new-container .modal-title').textContent = browser.i18n.getMessage('newContainerDialogTitle');
	location.hash = '#new-container';
	if (!await new Promise((res) => {
		const cancelHandler = (ev) => {
			cleanUp();
			res(false);
		};
		const okHandler = (ev) => {
			cleanUp();
			res(true);
		};
		const keyHandler = (ev) => {
			if (ev.key == 'Enter') {
				ev.preventDefault();
				okHandler();
			}
			if (ev.key == 'Escape') {
				ev.preventDefault();
				cancelHandler();
			}
		};
		const cleanUp = () => {
			location.hash = '';
			cancelButton.removeEventListener('click', cancelHandler);
			okButton.removeEventListener('click', okHandler);
			document.removeEventListener('keydown', keyHandler);
			name = nameElement.value;
			icon = iconElement.value;
			color = colorElement.value;
			nameElement.value = '';
		};
		cancelButton.addEventListener('click', cancelHandler);
		okButton.addEventListener('click', okHandler);
		document.addEventListener('keydown', keyHandler, true);
	})) {
		return;
	}
	await containers.create(name, color, icon);
	await render();
};

globalThis.showEditContainerPane = async (userContextId) => {
	const cancelButton = document.querySelector('#new-container-cancel-button');
	const okButton = document.querySelector('#new-container-ok-button');
	const nameElement = document.querySelector('#new-container-name');
	const iconElement = document.querySelector('#new-container-icon');
	const colorElement = document.querySelector('#new-container-color');
	const contextualIdentity = await containers.get(userContextId);
	nameElement.value = contextualIdentity.name;
	iconElement.value = contextualIdentity.icon;
	colorElement.value = contextualIdentity.color;
	document.querySelector('#new-container .modal-title').textContent = browser.i18n.getMessage('editContainerDialogTitle');
	let name = nameElement.value;
	let icon = iconElement.value;
	let color = colorElement.value;
	location.hash = '#new-container';
	if (!await new Promise((res) => {
		const cancelHandler = (ev) => {
			cleanUp();
			res(false);
		};
		const okHandler = (ev) => {
			cleanUp();
			res(true);
		};
		const keyHandler = (ev) => {
			if (ev.key == 'Enter') {
				ev.preventDefault();
				okHandler();
			}
			if (ev.key == 'Escape') {
				ev.preventDefault();
				cancelHandler();
			}
		};
		const cleanUp = () => {
			location.hash = '';
			cancelButton.removeEventListener('click', cancelHandler);
			okButton.removeEventListener('click', okHandler);
			document.removeEventListener('keydown', keyHandler);
			name = nameElement.value;
			icon = iconElement.value;
			color = colorElement.value;
			nameElement.value = '';
		};
		cancelButton.addEventListener('click', cancelHandler);
		okButton.addEventListener('click', okHandler);
		document.addEventListener('keydown', keyHandler, true);
	})) {
		return;
	}
	await containers.updateProperties(userContextId, name, color, icon);
	await render();
};

document.querySelector('#button-new-container').addEventListener('click', ev => {
	showNewContainerPane().catch(e => console.error(e));
});

document.querySelector('#button-hide-inactive').addEventListener('click', async (ev) => {
	await containers.hideAll(browser.windows.WINDOW_ID_CURRENT);
	await render();
});

render().catch(e => console.error(e));

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');
tabChangeChannel.addEventListener('message', ev => {
	render().catch(e => console.error(e));
});

// log to the background page when possible
browser.runtime.getBackgroundPage().then(background => {
	if (!background || !background.console) {
		console.error('Failed to fetch the Window object of the background page');
		return;
	}
	globalThis.console = background.console;
}).catch(e => console.error(e));
