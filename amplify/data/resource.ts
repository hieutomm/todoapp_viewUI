import { a, defineData } from "@aws-amplify/backend";
import { AllowListReceiptFilter } from "aws-cdk-lib/aws-ses";

const schema = a
  .schema({
    Todo: a.model({
      title: a.string().required(),
      done: a.boolean().default(false),
    }),
  })
  .authorization((allow) => [allow.owner()]);

export const data = defineData({ schema });
