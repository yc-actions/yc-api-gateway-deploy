import * as core from '@actions/core'
import * as github from '@actions/github'

import apigateway from '@nikolay.matrosov/yc-ts-sdk/lib/generated/yandex/cloud/serverless/apigateway/v1/apigateway'
import {
  ApiGatewayServiceService,
  CreateApiGatewayRequest,
  ListApiGatewayRequest,
  ListApiGatewayResponse,
  UpdateApiGatewayRequest
} from '@nikolay.matrosov/yc-ts-sdk/lib/generated/yandex/cloud/serverless/apigateway/v1/apigateway_service'
import {completion, getResponse} from '@nikolay.matrosov/yc-ts-sdk/lib/src/operation'
import {Client} from 'nice-grpc'
import {Session} from '@nikolay.matrosov/yc-ts-sdk'
import {fromServiceAccountJsonFile} from '@nikolay.matrosov/yc-ts-sdk/lib/src/TokenService/iamTokenService'
import {ApiGatewayService} from '@nikolay.matrosov/yc-ts-sdk/lib/api/serverless/apigateway/v1'
import {FieldMask} from '@nikolay.matrosov/yc-ts-sdk/lib/generated/google/protobuf/field_mask'
import * as fs from 'fs'

export declare type ApiGateway = apigateway.ApiGateway

async function findGatewayByName(
  gatewayService: Client<typeof ApiGatewayServiceService, {}>,
  folderId: string,
  gatewayName: string
): Promise<ListApiGatewayResponse> {
  return await gatewayService.list(
    ListApiGatewayRequest.fromPartial({
      pageSize: 100,
      folderId,
      filter: `name = "${gatewayName}"`
    })
  )
}

// async function getGatewayById(
//   gatewayService: Client<typeof ApiGatewayServiceService, {}>,
//   gatewayId: string
// ): Promise<ApiGateway> {
//   return await gatewayService.get(
//     GetApiGatewayRequest.fromPartial({
//       apiGatewayId: gatewayId
//     })
//   )
// }

async function createGateway(
  session: Session,
  gatewayService: Client<typeof ApiGatewayServiceService, {}>,
  folderId: string,
  gatewayName: string,
  gatewaySpec: string
): Promise<ApiGateway> {
  const repo = github.context.repo
  const gatewayCreateOperation = await gatewayService.create(
    CreateApiGatewayRequest.fromPartial({
      folderId,
      name: gatewayName,
      description: `Created from: ${repo.owner}/${repo.repo}`,
      openapiSpec: gatewaySpec
    })
  )
  const operation = await completion(gatewayCreateOperation, session)
  return getResponse(operation) as ApiGateway
}

async function updateGatewaySpec(
  session: Session,
  gatewayService: Client<typeof ApiGatewayServiceService, {}>,
  gatewayId: string,
  gatewaySpec: string
): Promise<ApiGateway> {
  const gatewayUpdateOperation = await gatewayService.update(
    UpdateApiGatewayRequest.fromPartial({
      apiGatewayId: gatewayId,
      openapiSpec: gatewaySpec,
      updateMask: FieldMask.fromPartial({
        paths: ['openapi_spec']
      })
    })
  )
  const operation = await completion(gatewayUpdateOperation, session)
  return getResponse(operation) as ApiGateway
}

async function run(): Promise<void> {
  try {
    core.info(`start`)
    const ycSaJsonCredentials = core.getInput('yc-sa-json-credentials', {
      required: true
    })

    const folderId: string = core.getInput('folder-id', {
      required: true
    })
    const gatewayName: string = core.getInput('gateway-name', {
      required: true
    })
    let gatewaySpec: string
    const gatewaySpecFile = core.getInput('spec-file')
    if (gatewaySpecFile) {
      gatewaySpec = fs.readFileSync(gatewaySpecFile).toString()
    } else {
      gatewaySpec = core.getInput('spec', {
        required: true
      })
    }
    core.info(`Folder ID: ${folderId}, gateway name: ${gatewayName}`)

    const serviceAccountJson = fromServiceAccountJsonFile(JSON.parse(ycSaJsonCredentials))
    const session = new Session({serviceAccountJson})
    const gatewayService = ApiGatewayService(session)

    const gatewaysResponse = await findGatewayByName(gatewayService, folderId, gatewayName)
    let gateway: ApiGateway
    if (gatewaysResponse.apiGateways.length) {
      gateway = gatewaysResponse.apiGateways[0]
      core.info(`Gateway with name: ${gatewayName} already exists and has id: ${gateway.id}`)
      gateway = await updateGatewaySpec(session, gatewayService, gateway.id, gatewaySpec)
      core.info(`Gateway updated successfully`)
    } else {
      core.info(`There is no gateway with name: ${gatewayName}. Creating a new one.`)
      gateway = await createGateway(session, gatewayService, folderId, gatewayName, gatewaySpec)
      core.info(`Gateway successfully created. Id: ${gateway.id}`)
    }
    core.setOutput('id', gateway.id)
    core.setOutput('domain', gateway.domain)
  } catch (error) {
    if (error instanceof Error) {
      core.error(error)
      core.setFailed(error.message)
    }
  }
}

run()
