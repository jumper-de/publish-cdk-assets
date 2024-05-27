import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { zip } from "zip-a-folder";

import { Asset } from "./interfaces";

export async function publishAsset(
  key: string,
  asset: Asset,
  partition: string,
  account: string,
  region: string,
) {
  if (asset.source.packaging === "zip") {
    console.log(`Compressing ${key}`);
    await zip(asset.source.path!, `${asset.source.path}.zip`);
    asset.source.path = `${asset.source.path}.zip`;
  }

  console.log(`Publishing ${key}`);
  console.log(asset.source.path);

  const promises: Promise<any>[] = [];

  for (var destinationKey in asset.destinations) {
    const destination = asset.destinations[destinationKey];

    const objectKey = destination.objectKey;
    const bucketName = destination.bucketName
      .replaceAll("${AWS::Partition}", partition)
      .replaceAll("${AWS::Region}", region)
      .replaceAll("${AWS::AccountId}", account);
    const assumeRoleArn = destination
      .assumeRoleArn!.replaceAll("${AWS::Partition}", partition)
      .replaceAll("${AWS::Region}", region)
      .replaceAll("${AWS::AccountId}", account);

    const fileStream = fs.createReadStream(asset.source.path!);

    const credentials = fromTemporaryCredentials({
      params: {
        RoleArn: assumeRoleArn,
        RoleSessionName: `upload-cdk-asset-${key}`.substring(0, 64),
        DurationSeconds: 900,
      },
    });

    promises.push(
      new S3Client({
        credentials: credentials,
      }).send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: fileStream,
        }),
      ),
    );
  }

  await Promise.all(promises);
}

export async function publishAssets(
  assets: Map<string, Asset>,
  partition: string,
  account: string,
  region: string,
) {
  const promises: Promise<any>[] = [];

  for (var [assetKey, asset] of assets.entries()) {
    promises.push(publishAsset(assetKey, asset, partition, account, region));
  }

  await Promise.all(promises);
}
