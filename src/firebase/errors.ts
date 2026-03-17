'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  public readonly auth: { uid?: string; token?: string };

  constructor(context: SecurityRuleContext, user?: { uid: string } | null) {
    const authContext = {
      uid: user?.uid ?? '(undetermined - check client state)',
      token: user ? '(available)' : '(undetermined - check client state)',
    };
    
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify(
  {
    context,
    auth: authContext,
  },
  null,
  2
)}`;

    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    this.auth = authContext;

    // This is for V8's stack trace API
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
