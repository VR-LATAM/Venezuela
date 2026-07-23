// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be last
      'react-native-reanimated/plugin',
    ],
  };
};
