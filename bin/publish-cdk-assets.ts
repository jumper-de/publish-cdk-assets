#!/usr/bin/env node
import path from "path";
import fs from "fs";
import { Manifest } from "aws-cdk-lib/cloud-assembly-schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { zip } from "zip-a-folder";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

import { getNestedAssets } from "./../src/get-nested-assets";
import { publishAssets } from "./../src/publish-assets";

require("yargs")
  .command(
    "* <path>",
    "Publish CDK assets listed in manifest.json at <path>",
    {
      r: {
        alias: ["region"],
        type: "string",
        default: process.env.AWS_REGION,
      },
    },
    async (argv: any) => {
      const client = new STSClient({});
      const [, partition, , , account] = (
        await client.send(new GetCallerIdentityCommand({}))
      ).Arn!.split(":");

      await publishAssets(
        getNestedAssets(path.resolve(argv.path)),
        partition!,
        account!,
        argv.region
      );
    }
  )
  .command(
    "ls <path>",
    "List all CDK assets found in manifest.json at <path>",
    {},
    async (argv: any) => {
      getNestedAssets(path.resolve(argv.path)).forEach((asset, assetKey) =>
        console.log(assetKey)
      );
    }
  )
  .help()
  .alias("help", "h").argv;
