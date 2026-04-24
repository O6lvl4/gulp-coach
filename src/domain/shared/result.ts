export type Ok<T> = { readonly _tag: "ok"; readonly value: T };
export type Err<E> = { readonly _tag: "err"; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ _tag: "ok", value });
export const err = <E>(error: E): Err<E> => ({ _tag: "err", error });
export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r._tag === "ok";
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => r._tag === "err";
