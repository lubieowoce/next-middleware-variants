import { lazyThunk } from './utils';

export function lazyCache<TFn extends Function>(fn: TFn): TFn {
  const impl = lazyThunk(() => {
    const React = require('react') as typeof import('react');
    const { cache } = React;
    return cache(fn);
  })
  return ((...args: any[]) => impl()(...args)) as unknown as TFn 
}

