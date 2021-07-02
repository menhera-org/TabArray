// vim: ts=4 noet ai

(async () => {
	//

	const menuListElement = document.querySelector('#menuList');
	const currentWindow = await browser.windows.getCurrent();
	const windowId = currentWindow.id;
	
	const hideAllElement = document.createElement('li');
	hideAllElement.append('Collapse inactive groups');
	menuListElement.append(hideAllElement);

})();

