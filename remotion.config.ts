import { Config } from "@remotion/cli/config";

const concurrency = Number(process.env.REMOTION_CONCURRENCY ?? 2);

Config.setConcurrency(Number.isFinite(concurrency) ? concurrency : 2);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(18);
