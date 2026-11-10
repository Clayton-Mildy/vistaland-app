/** A user-facing failure: `key` is an i18n key shown to the user. */
export class ActionError extends Error {
  constructor(public key: string) {
    super(key);
  }
}
