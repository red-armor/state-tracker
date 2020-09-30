import invariant from 'invariant';
import { isTrackable, hideProperty, TRACKER } from './commons';
import { generateRemarkablePaths } from './path';
import context from './context';
import {
  IProxyTracker,
  IES5Tracker,
  PropProperty,
  ProxyTrackerInterface,
  ES5TrackerInterface,
} from './types';

const peek = (proxy: IProxyTracker | IES5Tracker, accessPath: Array<string>) => { // eslint-disable-line
  return accessPath.reduce((proxy, cur: string) => {
    proxy.setProp('isPeeking', true);
    const nextProxy = proxy[cur];
    proxy.setProp('isPeeking', false);
    return nextProxy;
  }, proxy);
};

function internalFunctions() {}
const proto = internalFunctions.prototype;

proto.assertLink = function(fnName: string) {
  console.log('assertLink');

  const proxy = this;
  const tracker = proxy[TRACKER];
  const trackerNode = tracker.trackerNode;

  invariant(
    trackerNode,
    `You should not use \`${fnName}\` method with pure \`proxy\` object.\n` +
      'which should be bind with an `trackerNode` object'
  );

  invariant(
    context.trackerNode !== trackerNode,
    `\`${fnName}\` method is used to update \`proxy\` object from upstream.\n` +
      'So it is not meaning to link proxy in current trackerNode scope'
  );
};

proto.reportAccessPath = function(path: string) {
  console.log('reportAccessPath');

  const proxy = this // eslint-disable-line
  const tracker = proxy[TRACKER];
  const paths = tracker.paths;
  const parentProxy = tracker.parentProxy;
  paths.push(path);
  if (!parentProxy) return;

  const parentTracker = parentProxy[TRACKER];
  parentTracker.reportAccessPath.call(parentProxy, path);
};

proto.cleanup = function() {
  console.log('cleanup');

  const proxy = this // eslint-disable-line
  const tracker = proxy[TRACKER];
  tracker.paths = [];
  tracker.propProperties = [];
};

proto.unlink = function() {
  console.log('unlink');

  const proxy = this // eslint-disable-line
  const tracker = proxy[TRACKER];
  return tracker.base;
};

proto.relink = function(path: Array<string>, baseValue: object) {
  console.log('relink');

  try {
    this.runFn('assertLink', 'relink');
    const proxy = this // eslint-disable-line
    let copy = path.slice();
    let last = copy.pop();
    const len = path.length;
    let nextBaseValue: {
      [key: string]: any;
    } = baseValue;

    // fix: {a: { b: 1 }} => {a: {}}, nextBaseValue[key] is undefined
    for (let i = 0; i < len; i++) {
      const key = path[i];
      if (typeof nextBaseValue[key] !== 'undefined') {
        nextBaseValue = nextBaseValue[key];
      } else {
        copy = path.slice(0, i - 1);
        last = path[i - 1];
        break;
      }
    }
    const nextProxy = peek(proxy, copy);
    nextProxy.relinkProp(last, nextBaseValue);
  } catch (err) {
    // infoLog('[proxy relink issue]', path, baseValue, err)
  }
};

proto.relinkProp = function(prop: string, newValue: object) {
  console.log('relinkProp');

  this.runFn('assertLink', 'relinkProp');
  const proxy = this // eslint-disable-line
  const base = proxy.getProp('base');
  const childProxies = proxy.getProp('childProxies');
  const accessPath = proxy.getProp('accessPath');

  if (Array.isArray(base)) {
    proxy.setProp(
      'base',
      base.filter(v => v)
    );
  }
  proxy.getProp('base')[prop] = newValue;

  if (isTrackable(newValue)) {
    childProxies[prop] = proxy.createChild(newValue, {
      accessPath: accessPath.concat(prop),
      parentProxy: proxy,
    });
  }
};

proto.relinkBase = function(baseValue: object) {
  console.log('relinkBase');

  const proxy = this;
  const tracker = proxy[TRACKER];
  tracker.rebase.call(proxy, baseValue);
};

proto.rebase = function(baseValue: { [key: string]: any }) {
  console.log('rebase');

  try {
    const proxy = this // eslint-disable-line

    // proxy self's value should be updated as well
    const keys = Object.keys(baseValue);
    keys.forEach(key => {
      proxy[key] = baseValue[key];
    });

    const tracker = proxy[TRACKER];
    tracker.base = baseValue;
  } catch (err) {
    // infoLog('[proxy] rebase ', err)
  }
};

proto.setRemarkable = function(): boolean {
  console.log('setRemarkable');

  const proxy = this // eslint-disable-line
  const tracker = proxy[TRACKER];
  const accessPath = tracker.accessPath;
  const parentProxy = tracker.parentProxy;
  if (!parentProxy) return false;
  const parentTracker = parentProxy[TRACKER];
  parentTracker.reportAccessPath.call(parentProxy, accessPath);
  return true;
};

proto.getRemarkableFullPaths = function() {
  console.log('getRemarkableFullPaths');
  const processed = new WeakMap<
    IES5Tracker | IProxyTracker,
    ProxyTrackerInterface | ES5TrackerInterface
  >();

  const proxy = this // eslint-disable-line
  const tracker = proxy[TRACKER];

  // console.log('proxy ', proxy)
  // proxy is different with source belows.
  processed.set(proxy, tracker);

  const paths = tracker.paths;
  const propProperties = tracker.propProperties;
  const rootPath = tracker.rootPath;
  const internalPaths = generateRemarkablePaths(paths).map(path =>
    rootPath.concat(path)
  );

  console.log('start -');

  const external = propProperties.map((prop: PropProperty) => {
    const { path, source } = prop;
    console.log('source ', source);
    if (source) {
      const sourceTracker = processed.get(source) || source[TRACKER];
      const sourceRootPath = sourceTracker.rootPath;
      if (!processed.get(source!)) {
        processed.set(source!, sourceTracker);
      }
      return sourceRootPath.concat(path);
    }
    return [];
  });
  const externalPaths = generateRemarkablePaths(external);

  return internalPaths.concat(externalPaths);
};

proto.assertScope = function() {
  console.log('assertScope');

  const proxy = this;
  const tracker = proxy[TRACKER];

  const useScope = tracker.useScope;

  if (!useScope) return;
  const trackerNode = tracker.trackerNode;

  // If `contextTrackerNode` is null, it means access top most data prop.
  if (!trackerNode) {
    console.warn(
      'trackerNode is undefined, which means you are using createTracker function directly.' +
        'Maybe you should create TrackerNode object.'
    );
  } else if (!trackerNode.contains(context.trackerNode) && context.trackerNode)
    throw new Error(
      trackerNode.id +
        'is not child node of ' +
        context.trackerNode.id +
        'Property only could be accessed by self node or parent node.'
    );
};

hideProperty(proto, 'assertLink');
hideProperty(proto, 'reportAccessPath');
hideProperty(proto, 'cleanup');
hideProperty(proto, 'unlink');
hideProperty(proto, 'relink');
hideProperty(proto, 'relinkBase');
hideProperty(proto, 'relinkProp');
hideProperty(proto, 'setRemarkable');
hideProperty(proto, 'getRemarkableFullPaths');
hideProperty(proto, 'rebase');
hideProperty(proto, 'assertScope');

export default internalFunctions;
