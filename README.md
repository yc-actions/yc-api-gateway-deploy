## GitHub Action to deploy API Gateway to Yandex Cloud

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
        uses: yc-actions/yc-apigw-action-deploy@v2.0.0
        with:
          yc-sa-json-credentials: ${{ secrets.YC_SA_JSON_CREDENTIALS }}
          gateway-name: yc-action-demo
          folder-id: bbajn5q2d74c********
          spec-file: apigw.yaml
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## Permissions

This action requires the following minimum set of permissions:

TODO: add permission set

## License Summary

This code is made available under the MIT license.
