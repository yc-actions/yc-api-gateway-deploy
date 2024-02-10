import * as core from '@actions/core'
import * as github from '@actions/github'

import { decodeMessage, serviceClients, Session, waitForOperation } from '@yandex-cloud/nodejs-sdk'
import { FieldMask } from '@yandex-cloud/nodejs-sdk/dist/generated/google/protobuf/field_mask'
import { ApiGateway } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway'
import {
    ApiGatewayServiceService,
    CreateApiGatewayRequest,
    ListApiGatewayRequest,
    ListApiGatewayResponse,
    UpdateApiGatewayRequest
} from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway_service'
import { WrappedServiceClientType } from '@yandex-cloud/nodejs-sdk/dist/types'
import * as fs from 'fs'
import { fromServiceAccountJsonFile } from './service-account-json'

async function findGatewayByName(
    gatewayService: WrappedServiceClientType<typeof ApiGatewayServiceService>,
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

async function createGateway(
    session: Session,
    gatewayService: WrappedServiceClientType<typeof ApiGatewayServiceService>,
    folderId: string,
    gatewayName: string,
    gatewaySpec: string
): Promise<ApiGateway> {
    const repo = github.context.repo
    const request = CreateApiGatewayRequest.fromPartial({
        folderId,
        name: gatewayName,
        description: `Created from: ${repo.owner}/${repo.repo}`,
        openapiSpec: gatewaySpec
    })

    let operation = await gatewayService.create(request)

    operation = await waitForOperation(operation, session)
    if (!operation.response) {
        throw new Error('Empty operation response')
    }
    return decodeMessage<ApiGateway>(operation.response)
}

async function updateGatewaySpec(
    session: Session,
    gatewayService: WrappedServiceClientType<typeof ApiGatewayServiceService>,
    gatewayId: string,
    gatewaySpec: string
): Promise<ApiGateway> {
    const request = UpdateApiGatewayRequest.fromPartial({
        apiGatewayId: gatewayId,
        openapiSpec: gatewaySpec,
        updateMask: FieldMask.fromPartial({
            paths: ['openapi_spec']
        })
    })

    let operation = await gatewayService.update(request)

    operation = await waitForOperation(operation, session)
    if (!operation.response) {
        throw new Error('Empty operation response')
    }
    return decodeMessage<ApiGateway>(operation.response)
}

export async function run(): Promise<void> {
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
        const gatewaySpecFile = core.getInput('spec-file')
        let gatewaySpec = core.getInput('spec')

        if (!gatewaySpec && !gatewaySpecFile) {
            core.setFailed(new Error('Either spec or spec-file input must be provided'))
            return
        }

        if (gatewaySpecFile) {
            gatewaySpec = fs.readFileSync(gatewaySpecFile).toString()
        }
        core.info(`Folder ID: ${folderId}, gateway name: ${gatewayName}`)

        const serviceAccountJson = fromServiceAccountJsonFile(JSON.parse(ycSaJsonCredentials))
        const session = new Session({ serviceAccountJson })
        const gatewayService = session.client(serviceClients.ApiGatewayServiceClient)

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
        core.error(`${error}`)
        core.setFailed(`${error}`)
    }
}
