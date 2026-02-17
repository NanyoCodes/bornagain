'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify(
  {
    context,
    // In a real scenario, you'd get auth context from the SDK or a server-side call.
    // For client-side errors, this part is illustrative.
    auth: {
      uid: '(undetermined - check client state)',
      token: '(undetermined - check client state)',
    },
  },
  null,
  2
)}`;

    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is for V8's stack trace API
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
