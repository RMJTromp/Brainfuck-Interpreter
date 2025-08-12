type PromisifyFunction<T extends (...args: any[]) => any> = (
    ...args: Parameters<T>
) => Promise<ReturnType<T>>;

export function promisify<T extends (...args: any[]) => any>(
    fn: T
): PromisifyFunction<T> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
            return fn(...args);
        } catch (error) {
            throw error;
        }
    };
}

// Alternative version that uses setTimeout to make it truly async
export function promisifyAsync<T extends (...args: any[]) => any>(
    fn: T
): PromisifyFunction<T> {
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return new Promise((resolve, reject) => {
            try {
                setTimeout(() => {
                    try {
                        const result = fn(...args);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, 0);
            } catch (error) {
                reject(error);
            }
        });
    };
}