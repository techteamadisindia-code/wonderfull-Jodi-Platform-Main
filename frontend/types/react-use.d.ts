declare namespace React {
  export function use<T>(usable: Promise<T>): T;
  export function use<T>(usable: React.Context<T>): T;
  export function use<T>(usable: any): T;
}
