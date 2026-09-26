const APP_VARIANTS = {
  development: {
    name: 'Higio Dev',
    scheme: 'higio-dev',
    iosBundleIdentifier: 'com.domag.higio.dev',
    androidPackage: 'com.domag.higio.dev',
  },
  preview: {
    name: 'Higio Preview',
    scheme: 'higio-preview',
    iosBundleIdentifier: 'com.domag.higio.preview',
    androidPackage: 'com.domag.higio.preview',
  },
  production: {
    name: 'Higio',
    scheme: 'higio',
    iosBundleIdentifier: 'com.domag.higio',
    androidPackage: 'com.domag.higio',
  },
};

const WEB_SQLITE_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

module.exports = ({ config }) => {
  const requestedVariant = process.env.APP_VARIANT ?? 'development';
  const variant = Object.hasOwn(APP_VARIANTS, requestedVariant)
    ? requestedVariant
    : 'development';
  const variantConfig = APP_VARIANTS[variant];
  const plugins = (config.plugins ?? []).map((plugin) => {
    if (plugin === 'expo-router') {
      return ['expo-router', { headers: WEB_SQLITE_HEADERS }];
    }

    if (Array.isArray(plugin) && plugin[0] === 'expo-router') {
      return [
        'expo-router',
        {
          ...(plugin[1] ?? {}),
          headers: {
            ...(plugin[1]?.headers ?? {}),
            ...WEB_SQLITE_HEADERS,
          },
        },
      ];
    }

    return plugin;
  });
  const hasSQLitePlugin = plugins.some((plugin) =>
    Array.isArray(plugin)
      ? plugin[0] === 'expo-sqlite'
      : plugin === 'expo-sqlite',
  );

  return {
    ...config,
    name: variantConfig.name,
    scheme: variantConfig.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: variantConfig.iosBundleIdentifier,
    },
    android: {
      ...config.android,
      package: variantConfig.androidPackage,
    },
    plugins: hasSQLitePlugin ? plugins : [...plugins, 'expo-sqlite'],
    extra: {
      ...config.extra,
      environment: variant,
    },
  };
};
