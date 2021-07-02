
export const getIds = async () => {
  try {
    const userContexts = await browser.contextualIdentities.query({});
    return [... userContexts].map(userContext => userContext.cookieStoreId);
  } catch (e) {
    console.error('userContext disabled?');
    return [];
  }
};

export const get = async (aId) => {
  try {
    const userContext = await browser.contextualIdentities.get(aId);
    return userContext;
  } catch (e) {
    // userContext disabled or nonexsistent id
    return null;
  }
};

export const getIndex = async (aId) => {
  const userContextIds = await getIds();
  return userContextIds.indexOf(aId);
};


