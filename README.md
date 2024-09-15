## GitHub Action to deploy API Gateway to Yandex Cloud

[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Create an API Gateway with the provided name if there is no one, or udpate existing gateway's specification

**Table of Contents**

<!-- toc -->

- [Usage](#usage)
- [Permissions](#permissions)
- [License Summary](#license-summary)

<!-- tocstop -->

## Usage

```yaml
      - name: Deploy API Gateway
        id: deploy-gateway
        uses: yc-actions/yc-api-gateway-deploy@v2
        with:
          yc-sa-json-credentials: ${{ secrets.YC_SA_JSON_CREDENTIALS }}
          gateway-name: yc-action-demo
          folder-id: bbajn5q2d74c********
          spec-file: apigw.yaml
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## Permissions

### Deploy time permissions

To perform this action, the service account on behalf of which we are acting must have
the `api-gateway.editor` role or higher.

Additionally, you may need to grant the following optional roles depending on your specific needs:

| Optional Role              | Required For                                                                           |
|----------------------------|----------------------------------------------------------------------------------------|
| `iam.serviceAccounts.user` | Providing the service account ID in parameters, ensuring access to the service account |
| `vpc.user`                 | Deploying the function in a VPC with a specified network ID                            |

### Runtime permissions

The service account provided to gateway specification via `service-account` parameter must have the following roles,
depending on what extension they are used in:

| Required Role                            | Extension               | Required For                                       |
|------------------------------------------|-------------------------|----------------------------------------------------|
| `functions.functionInvoker`              | `cloud_functions`       | To invoke the function                             |
| `serverless-containers.containerInvoker` | `serverless_containers` | To invoke the container                            |
| `storage.viewer`                         | `object_storage`        | To read objects from private Object Storage Bucket |
| `datasphere.user`                        | `cloud_datasphere`      | To call DataSphere inference endpoint              |
| `yds.writer`                             | `cloud_datastreams`     | To put message into Yandex DataStream              |
| `ymq.writer`                             | `cloud_ymq`             | To put message into Yandex Message Queue           |
| `ydb.editor`                             | `cloud_ydb`             | To execute queries in YDB                          |

## License Summary

This code is made available under the MIT license.
