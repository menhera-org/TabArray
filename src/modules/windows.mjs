// vim: ts=2 sw=2 et ai

export const getWindowIds = async () => {
  try {
    const windows = await browser.windows.getAll({
      populate: false,
      windowTypes: ['normal'],
    });
    return windows.map((window) => window.id);
  } catch (e) {
    return [];
  }
};
