export type Specification<T> = (subject: T) => boolean;

export const and = <T>(...specs: ReadonlyArray<Specification<T>>): Specification<T> =>
  (s) => specs.every((spec) => spec(s));
export const or = <T>(...specs: ReadonlyArray<Specification<T>>): Specification<T> =>
  (s) => specs.some((spec) => spec(s));
export const not = <T>(spec: Specification<T>): Specification<T> => (s) => !spec(s);
