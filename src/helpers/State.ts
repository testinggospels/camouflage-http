export const StateHelper = (context: any) => {
    const cookies = context.data.root.request.cookies || {};
    const key = `mocked-state-${context.hash.key}`;
    return cookies[key] || context.fn(this);
};