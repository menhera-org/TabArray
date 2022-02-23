// vim: ts=4 noet ai
/*
	Container Tab Groups
	Copyright (C) 2022 Menhera.org

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import '../modules/background-console.mjs';
import * as containers from '../modules/containers.mjs';
import { toUserContextId } from '../modules/containers.mjs';
import {sleep} from '../modules/utils.mjs';
import {WebExtensionsBroadcastChannel} from '../modules/broadcasting.mjs';
import '/components/usercontext-colorpicker.mjs';
import '/components/usercontext-iconpicker.mjs';
import {ADDON_PAGE, PANORAMA_PAGE} from '../defs.mjs';
import { getStateManager, getFirstpartyManager } from '../modules/global-state.mjs';
import { IndexTab } from '../modules/IndexTab.mjs';

import {config} from '../modules/config.mjs';

const STATE_NO_TABS = 0;
const STATE_HIDDEN_TABS = 1;
const STATE_VISIBLE_TABS = 2;

let currentWindowId;

document.documentElement.lang = browser.i18n.getMessage('effectiveLocale');
document.title = browser.i18n.getMessage('browserActionPopupTitle');
document.querySelector('#button-panorama > .button-text').textContent = browser.i18n.getMessage('buttonPanorama');
document.querySelector('#button-panorama').title = browser.i18n.getMessage('buttonPanorama');
document.querySelector('#button-new-container > .button-text').textContent = browser.i18n.getMessage('buttonNewContainer');
document.querySelector('#button-new-container').title = browser.i18n.getMessage('buttonNewContainer');
document.querySelector('#confirm-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
document.querySelector('#confirm-ok-button').textContent = browser.i18n.getMessage('buttonOk');
document.querySelector('#new-container-cancel-button').textContent = browser.i18n.getMessage('buttonCancel');
document.querySelector('#new-container-ok-button').textContent = browser.i18n.getMessage('buttonOk');
document.querySelector('label[for="new-container-name"]').textContent = browser.i18n.getMessage('newContainerNameLabel');
document.querySelector('#new-container-name').placeholder = browser.i18n.getMessage('newContainerNamePlaceholder');
document.querySelector('#menu-item-main > .button-text').textContent = browser.i18n.getMessage('menuItemMain');
document.querySelector('#menu-item-windows > .button-text').textContent = browser.i18n.getMessage('menuItemWindows');
document.querySelector('#menu-item-sites > .button-text').textContent = browser.i18n.getMessage('menuItemSites');
document.querySelector('#menu-item-settings > .button-text').textContent = browser.i18n.getMessage('buttonSettings');
document.querySelector('#button-new-window > .button-text').textContent = browser.i18n.getMessage('buttonNewWindow');

document.querySelector('#main').classList.add('rendering');

location.hash = '#main';
document.body.dataset.activeContent = 'main';
window.addEventListener('hashchange', (ev) => {
	document.body.dataset.activeContent = location.hash.slice(1);
});

let configPopupSize;
config.observe('appearance.popupSize', (value) => {
	configPopupSize = value;
	if (configPopupSize == 'large') {
		document.body.classList.add('large');
	}
});

const buttonNewWindow = document.querySelector('#button-new-window');
buttonNewWindow.addEventListener('click', (ev) => {
	browser.windows.create({}).then((windowObj) => {
		console.log('New window (#%d) opened', windowObj.id);
	}).catch((e) => {
		console.error(e);
	});
});

const renderTab = (tab) => {
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
	tabPinButton.addEventListener('click', (ev) => {
		ev.stopImmediatePropagation();
		if (tab.pinned) {
			tab.unpin().catch((e) => {
				console.error(e);
			});
		} else {
			tab.pin().catch((e) => {
				console.error(e);
			});
		}
	});
	const tabIconElement = document.createElement('img');
	tabIconElement.classList.add('tab-icon');
	let iconUrl = tab.favIconUrl;
	if (!iconUrl) {
		iconUrl = '/img/transparent.png';
	}
	tabIconElement.src = iconUrl;
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
	tabCloseButton.title = browser.i18n.getMessage('buttonTabClose');
	tabElement.append(tabCloseButton);
	tabCloseButton.addEventListener('click', (ev) => {
		ev.stopImmediatePropagation();
		tab.close().catch((e) => {
			console.error(e);
		});
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

	tabElement.addEventListener('click', (_ev) => {
		tab.focus().then(() => {
			window.close();
		}).catch((e) => {
			console.error(e);
		});
	});

	const {userContextId} = tab;
	const container = StateManager.getUserContext(userContextId);
	if (container && container.id != 0) {
		tabElement.style.borderColor = container.colorCode;
	}
	return tabElement;
};

const renderContainerHeading = (userContextId, details) => {
	const mode = details ? details.mode : '';
	const container = StateManager.getUserContext(userContextId);
	const containerElement = document.createElement('li');
	containerElement.dataset.name = container.name;
	containerElement.classList.add('container');
	if (!userContextId) {
		containerElement.classList.add('container-default');
	}
	const visibilityToggleButton = document.createElement('button');
	visibilityToggleButton.classList.add('container-visibility-toggle');
	containerElement.append(visibilityToggleButton);
	visibilityToggleButton.disabled = true;
	const containerIcon = document.createElement('div');
	const iconUrl = container.iconUrl || '/img/category_black_24dp.svg';
	containerIcon.style.mask = `url(${iconUrl}) center center/contain no-repeat`;
	containerIcon.style.backgroundColor = container.colorCode || '#000';
	containerIcon.classList.add('container-icon');
	containerElement.append(containerIcon);
	const containerLabel = document.createElement('div');
	containerElement.append(containerLabel);
	containerLabel.classList.add('container-label');
	containerLabel.textContent = container.name;
	const closeContainerButton = document.createElement('button');
	containerElement.append(closeContainerButton);
	closeContainerButton.classList.add('close-container-button');
	closeContainerButton.title = browser.i18n.getMessage('tooltipContainerCloseAll');
	switch (mode) {
		case 'window': {
			const {windowId} = details;
			closeContainerButton.addEventListener('click', (ev) => {
				containers.closeAllTabsOnWindow(userContextId, windowId).catch((e) => {
					console.error(e);
				});
			});
			break;
		}
		case 'site': {
			const {site} = details;
			closeContainerButton.addEventListener('click', (ev) => {
				FirstpartyManager.closeAllByContainer(site, userContextId).catch((e) => {
					console.error(e);
				});
			});
			break;
		}
		default: {
			closeContainerButton.disabled = true;
		}
	}
	
	return containerElement;
};

const renderContainer = (userContextId) => {
	const container = StateManager.getUserContext(userContextId);
	const tabs = StateManager.getBrowserWindow(currentWindowId).getTabs();
	const windowId = currentWindowId;
	const containerElement = document.createElement('li');
	containerElement.dataset.name = container.name;
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
		render();
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
	closeContainerButton.addEventListener('click', (ev) => {
		containers.closeAllTabsOnWindow(userContextId, windowId).catch((e) => {
			console.error(e);
		});
	});
	if (!userContextId) {
		editContainerButton.disabled = true;
	} else {
		const deleteContainerButton = document.createElement('button');
		containerElement.append(deleteContainerButton);
		deleteContainerButton.title = browser.i18n.getMessage('tooltipContainerDelete');
		deleteContainerButton.classList.add('delete-container-button');
		deleteContainerButton.addEventListener('click', (ev) => {
			confirmAsync(browser.i18n.getMessage('confirmContainerDelete', container.name)).then((result) => {
				if (!result) return;
				return containers.remove(userContextId);
			}).catch((e) => {
				console.error(e);
			});
		});
	}
	const tabListElement = document.createElement('ul');
	tabListElement.classList.add('container-tabs');
	containerElement.append(tabListElement);
	let containerState = STATE_NO_TABS;
	let tabCount = 0;
	for (const tab of tabs) {
		try {
			new IndexTab(tab.url);
			continue;
		} catch (e) {}
		if (tab.pinned) continue;
		if (tab.userContextId != userContextId) continue;
		tabCount++;
		if (tab.hidden) {
			containerState = STATE_HIDDEN_TABS;
		} else {
			containerState = STATE_VISIBLE_TABS;
			const tabElement = renderTab(tab);
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

		default:
			closeContainerButton.disabled = true;
	}
	return containerElement;
};

let rendering = false;
let shouldRerender = false;
let sitesRendering = false;
globalThis.render = () => {
	if (rendering) {
		shouldRerender = true;
		return;
	}
	rendering = true;
	shouldRerender = false;
	const mainElement = document.querySelector('#main');
	try {
		mainElement.classList.add('rendering');
		const initScrollY = mainElement.scrollTop;
		const menuListElement = document.querySelector('#menuList');
		menuListElement.textContent = '';

		const windowId = currentWindowId;

		const currentWindowLabel = document.createElement('li');
		menuListElement.append(currentWindowLabel);
		currentWindowLabel.classList.add('window-label');
		const currentWindowLabelContent = document.createElement('div');
		currentWindowLabel.append(currentWindowLabelContent);
		currentWindowLabelContent.classList.add('window-label-name');
		currentWindowLabelContent.textContent = browser.i18n.getMessage('currentWindow', windowId);

		const currentWindowLabelCollapseButton = document.createElement('button');
		currentWindowLabel.append(currentWindowLabelCollapseButton);
		currentWindowLabelCollapseButton.classList.add('window-collapse-button');
		currentWindowLabelCollapseButton.title = browser.i18n.getMessage('tooltipCollapseContainers');
		currentWindowLabelCollapseButton.addEventListener('click', (ev) => {
			containers.hideAll(browser.windows.WINDOW_ID_CURRENT).catch((e) => {
				console.error(e);
			});
		});

		const currentWindowLabelExpandButton = document.createElement('button');
		currentWindowLabel.append(currentWindowLabelExpandButton);
		currentWindowLabelExpandButton.classList.add('window-expand-button');
		currentWindowLabelExpandButton.title = browser.i18n.getMessage('tooltipExpandContainers');
		currentWindowLabelExpandButton.addEventListener('click', (ev) => {
			containers.showAll(browser.windows.WINDOW_ID_CURRENT).catch((e) => {
				console.error(e);
			});
		});

		const tabs = StateManager.getBrowserWindow(currentWindowId).getTabs();
		const windowTabCount = tabs.length;
		currentWindowLabelContent.dataset.tabCount = windowTabCount;

		const openUserContextIdSet = new Set;
		for (const tab of tabs) {
			if (!tab.pinned) {
				openUserContextIdSet.add(tab.userContextId);
				continue;
			}
			const tabElement = renderTab(tab);
			menuListElement.append(tabElement);
		}
		
		const userContextIds = StateManager.getUserContexts().map((userContext) => userContext.id);
		const openUserContextIds = userContextIds.filter(userContextId => openUserContextIdSet.has(userContextId));
		const availableUserContextIds = userContextIds.filter(userContextId => !openUserContextIdSet.has(userContextId));
		for (const userContextId of openUserContextIds) {
			const containerElement = renderContainer(userContextId);
			menuListElement.append(containerElement);
		}

		const moreContainersLabel = document.createElement('li');
		menuListElement.append(moreContainersLabel);
		moreContainersLabel.classList.add('window-label');
		const moreContainersLabelContent = document.createElement('div');
		moreContainersLabelContent.classList.add('window-label-name');
		moreContainersLabel.append(moreContainersLabelContent);
		moreContainersLabelContent.textContent = browser.i18n.getMessage('currentWindowMoreContainers');

		for (const userContextId of availableUserContextIds) {
			const containerElement = renderContainer(userContextId);
			menuListElement.append(containerElement);
		}

		const windowMenuListElement = document.querySelector('#windowMenuList');
		windowMenuListElement.textContent = '';
		const windows = StateManager.getBrowserWindows()
		.filter((browserWindow) => browserWindow.isNormal);
		for (const window of windows) {
			const windowLabel = document.createElement('li');
			windowMenuListElement.append(windowLabel);
			windowLabel.classList.add('window-label');
			const windowLabelContent = document.createElement('div');
			windowLabelContent.classList.add('window-label-name');
			windowLabel.append(windowLabelContent);
			windowLabelContent.textContent = browser.i18n.getMessage('windowLabel', window.id);
			windowLabelContent.title = browser.i18n.getMessage('tooltipWindowLabel', window.id);
			windowLabelContent.addEventListener('click', (ev) => {
				window.focus().catch(e => console.error(e));
			});
			const windowLabelCloseButton = document.createElement('button');
			windowLabel.append(windowLabelCloseButton);
			windowLabelCloseButton.classList.add('window-close-button');
			windowLabelCloseButton.title = browser.i18n.getMessage('tooltipCloseWindow');
			windowLabelCloseButton.addEventListener('click', (ev) => {
				window.close().catch(e => console.error(e));
			});
			const tabs = window.getTabs();
			windowLabelContent.dataset.tabCount = tabs.length;
			for (const tab of tabs) {
				if (!tab.active) continue;
				const containerElement = renderContainerHeading(tab.userContextId, {
					mode: 'window',
					windowId: tab.windowId
				});
				windowMenuListElement.append(containerElement);
				const tabElement = renderTab(tab);
				windowMenuListElement.append(tabElement);
			}
		}
		mainElement.scrollTop = initScrollY;

		const sitesPaneTop = document.querySelector('#sites-pane-top');
		const sitePaneDetails = document.querySelector('#site-pane-details');
		
		// refresh content of site details view
		renderSiteDetails(null).catch((e) => {
			console.error(e);
		});

		if (sitesRendering) {
			throw void 0;
		}
		sitesRendering = true;
		FirstpartyManager.getAll().then((registrableDomainsData) => {
			sitesPaneTop.textContent = '';
			const registrableDomains = Reflect.ownKeys(registrableDomainsData);
			for (const registrableDomain of registrableDomains) {
				const data = registrableDomainsData[registrableDomain];
				const button = document.createElement('button');
				const buttonText = document.createElement('span');
				buttonText.classList.add('button-text');
				const closeButton = document.createElement('button');
				closeButton.classList.add('site-close');
				button.append(buttonText);
				button.append(closeButton);
				buttonText.dataset.tabCount = data.tabCount;
				buttonText.textContent = registrableDomain || '(null)';
				sitesPaneTop.append(button);

				closeButton.addEventListener('click', (ev) => {
					ev.stopImmediatePropagation();
					closeSite(registrableDomain).catch((e) => {
						console.error(e);
					});
				});
				const tabIconElement = document.createElement('img');
				tabIconElement.classList.add('tab-icon');
				const site = document.createElement('span');
				site.classList.add('site');
				button.append(site);
				let iconUrl = data.icon;
				if (!iconUrl) {
					iconUrl = '/img/transparent.png';
				}
				tabIconElement.src = iconUrl;
				site.append(tabIconElement);
				const siteTitle = document.createElement('span');
				siteTitle.classList.add('tab-label');
				siteTitle.textContent = data.title;
				site.append(siteTitle);
				button.addEventListener('click', (ev) => {
					renderSiteDetails(registrableDomain)
					.catch((e) => {
						console.error(e);
					});
				});
			}
			sitesRendering = false;
		});
	} finally {
		mainElement.classList.remove('rendering');
		setTimeout(() => {
			rendering = false;
			if (!shouldRerender) return;
			shouldRerender = false;
			render();
		}, 100);
	}
};

globalThis.renderDelay = () => {
	if (rendering) {
		shouldRerender = true;
		return;
	}
	rendering = true;
	shouldRerender = true;
	setTimeout(() => {
		rendering = false;
		if (!shouldRerender) return;
		shouldRerender = false;
		render();
	}, 100);
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
			location.hash = '#main';
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
			location.hash = '#main';
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
	render();
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
			location.hash = '#main';
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
	render();
};

const sitesElement = document.querySelector('#sites');

let renderedSite = '';
globalThis.renderSiteDetails = async (aSite) => {
	const menuListElement = document.querySelector('#siteMenuList');
	menuListElement.textContent = '';
	if (aSite) {
		sitesElement.dataset.activeContent = 'sites-details';
		renderedSite = aSite;
	} else if (renderedSite) {
		aSite = renderedSite;
	} else {
		return;
	}
	document.querySelector('#site-pane-details-domain').textContent = aSite;
	const tabs = await browser.tabs.query({
		windowType: 'normal',
		url: ['*://*/*'], // HTTP and HTTPS
	});
	const tabsByUserContextId = new Map;
	for (const tabObj of tabs) {
		try {
			const url = new URL(tabObj.url); // this should not throw
			if (url.protocol != 'http:' && url.protocol != 'https:') {
				console.warn('This should not happen');
				continue;
			}
			const {hostname} = url;
			const registrableDomain = FirstpartyManager.getRegistrableDomain(hostname);
			if (registrableDomain != aSite) {
				continue;
			}
			const userContextId = containers.toUserContextId(tabObj.cookieStoreId);
			if (!tabsByUserContextId.has(userContextId)) {
				tabsByUserContextId.set(userContextId, []);
			}
			const matchedTabs = tabsByUserContextId.get(userContextId);
			matchedTabs.push(StateManager.getBrowserTab(tabObj.id));
		} catch (e) {
			console.error('This should not happen!', e);
		}
	}
	const userContextIds = [... tabsByUserContextId.keys()].sort();
	for (const userContextId of userContextIds) {
		const containerElement = renderContainerHeading(userContextId, {
			mode: 'site',
			site: aSite,
		});
		menuListElement.append(containerElement);
		const tabs = tabsByUserContextId.get(userContextId);
		for (const tab of tabs) {
			const tabElement = renderTab(tab);
			menuListElement.append(tabElement);
		}
	}
};

globalThis.closeSite = async (aRegistrableDomain) => {
	//
	const tabs = await browser.tabs.query({
		windowType: 'normal',
		url: ['*://*/*'], // HTTP and HTTPS
	});
	const tabIdsClosed = [];
	for (const tabObj of tabs) {
		const url = new URL(tabObj.url); // this should not throw
		if (url.protocol != 'http:' && url.protocol != 'https:') {
			console.warn('This should not happen');
			continue;
		}
		const {hostname} = url;
		const registrableDomain = FirstpartyManager.getRegistrableDomain(hostname) || '';
		if (aRegistrableDomain != registrableDomain) {
			continue;
		}
		tabIdsClosed.push(tabObj.id);
	}
	await browser.tabs.remove(tabIdsClosed);
};

document.querySelector('#site-pane-details-back-button').addEventListener('click', ev => {
	sitesElement.dataset.activeContent = 'sites';
});

document.querySelector('#menu-item-sites').addEventListener('click', ev => {
	sitesElement.dataset.activeContent = 'sites';
});

document.querySelector('#button-new-container').addEventListener('click', ev => {
	showNewContainerPane().catch(e => console.error(e));
});

Promise.all([
	browser.windows.get(browser.windows.WINDOW_ID_CURRENT).then((windowObj) => {
		return windowObj.id;
	}),
	getStateManager(),
	getFirstpartyManager(),
]).then(async ([windowId, aStateManager, aFirstpartyManager]) => {
  globalThis.StateManager = aStateManager;
  globalThis.FirstpartyManager = aFirstpartyManager;
  currentWindowId = windowId;
  render();
  StateManager.addEventListenerWindow(window, 'tabOpen', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabChange', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabClose', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabWindowChange', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabMove', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabShow', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabHide', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabPinned', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'tabUnpinned', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'activeTabChange', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'windowOpen', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'windowClose', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'userContextCreate', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'userContextChange', (ev) => {
	  renderDelay();
  });
  StateManager.addEventListenerWindow(window, 'userContextRemove', (ev) => {
	  renderDelay();
  });
});

/*
const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');
tabChangeChannel.addEventListener('message', ev => {
	render();
});
*/

document.querySelector('#menu-item-settings').addEventListener('click', (ev) => {
	ev.preventDefault();
	browser.runtime.openOptionsPage().then(() => {
		window.close();
	}).catch((e) => console.error(e));
});

document.querySelector('#button-panorama').addEventListener('click', (ev) => {
	browser.tabs.create({
		active: true,
		windowId: browser.windows.WINDOW_ID_CURRENT,
		url: browser.runtime.getURL(PANORAMA_PAGE),
	}).then(() => {
		window.close();
	}).catch((e) => console.error(e));
});

const searchBox = document.querySelector('#search');
const menuListElement = document.querySelector('#menuList');

searchBox.focus();
searchBox.placeholder = browser.i18n.getMessage('searchPlaceholder');
searchBox.addEventListener('input', (ev) => {
	const rawValue = ev.target.value;
	const values = rawValue.trim().split(/\s+/u).map((value) => value.trim()).filter((value) => !!value);
	if (values.length) {
		const containers = menuListElement.querySelectorAll('.container');
		for (const container of containers) {
			const name = container.dataset.name.toLowerCase();
			let matched = false;
			for (const searchString of values) {
				if (name.includes(searchString.toLowerCase())) {
					matched = true;
					break;
				}
			}
			if (matched) {
				container.classList.add('search-matched');
			} else {
				container.classList.remove('search-matched');
			}
		}
		menuListElement.classList.add('search-result');
	} else {
		menuListElement.classList.remove('search-result');
	}
});
