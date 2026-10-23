import { Config } from "@remotion/cli/config";
import path from "path";

Config.setPort(4500);

Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...(currentConfiguration.resolve?.alias ?? {}),
        "@": path.resolve(process.cwd(), "src"),
      },
    },
  };
});

