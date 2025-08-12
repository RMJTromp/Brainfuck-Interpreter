type PromiseResolver<T> = {
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
};

/**
 * Creates a singleton factory function that ensures only one instance of the result is created.
 * @param factory
 * @usage getInstance = singleton(async () => { /* logic *\/});
 */
export function singleton<T extends any[], R>(
    factory: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
    let instance: R | undefined;
    let isCreating = false;
    let pendingCallbacks: PromiseResolver<R>[] = [];

    return async (...args: T): Promise<R> => {
        if (instance !== undefined)
            return instance;

        if (isCreating)
            return new Promise<R>((resolve, reject) => {
                pendingCallbacks.push({ resolve, reject });
            });

        isCreating = true;

        try {
            const result = await factory(...args);
            instance = result;

            pendingCallbacks.forEach(callback => callback.resolve(result));
            pendingCallbacks = [];

            return result;
        } catch (error) {
            pendingCallbacks.forEach(callback => callback.reject(error));
            pendingCallbacks = [];
            isCreating = false;

            throw error;
        }
    };
}