export interface EmailHeaderParams {
  to?: string[];
  cc?: string[];
  replyTo?: string;
}

export function generateEmailHeaders(params?: EmailHeaderParams) {
  const headers = {
    'Precedence': 'bulk',
    'X-Auto-Response-Suppress': 'All',
    'Auto-Submitted': 'auto-generated'
  };

  if (params?.to) {
    headers['To'] = params.to.join(', ');
  }
  if (params?.cc) {
    headers['Cc'] = params.cc.join(', ');
  }
  if (params?.replyTo) {
    headers['Reply-To'] = params.replyTo;
  }

  return headers;
}
