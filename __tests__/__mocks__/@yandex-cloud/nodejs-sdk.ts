/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiGateway } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway'
import { Operation } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/operation/operation'
import { Writer } from 'protobufjs'
import { decodeMessage } from '@yandex-cloud/nodejs-sdk'
import { ServiceAccount } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/iam/v1/service_account'

const sdk: any = jest.createMockFromModule('@yandex-cloud/nodejs-sdk')

let apiGateways: ApiGateway[] = []
let serviceAccounts: ServiceAccount[] = [
    ServiceAccount.fromJSON({
        id: 'serviceaccountid'
    })
]
let createGatewayFail = false
let updateGatewayFail = false

type PayloadClass<T> = {
    $type: string
    encode: (message: T, writer?: Writer) => Writer
    decode: (payload: Uint8Array) => T
    fromJSON: (payload: object) => T
}

function getOperation(payloadClass: PayloadClass<any>, data: object): Operation {
    return Operation.fromJSON({
        id: 'operationid',
        response: {
            typeUrl: payloadClass.$type,
            value: Buffer.from(payloadClass.encode(payloadClass.fromJSON(data)).finish()).toString('base64')
        },
        done: true
    })
}

const ApiGatewayServiceMock = {
    list: jest.fn().mockImplementation(() => ({
        apiGateways
    })),
    create: jest.fn().mockImplementation(() => {
        if (createGatewayFail) {
            return Operation.fromJSON({
                id: 'operationid',
                error: {},
                done: true
            })
        }

        const data = {
            id: 'apigatewayid',
            name: 'apigatewayname',
            folderId: 'folderid',
            createdAt: '2021-01-01T00:00:00Z',
            openapiSpec: 'openapispec',
            domain: 'domain'
        }

        apiGateways = [ApiGateway.fromJSON(data)]
        return getOperation(ApiGateway, data)
    }),
    update: jest.fn().mockImplementation(() => {
        if (updateGatewayFail) {
            return Operation.fromJSON({
                id: 'operationid',
                error: {},
                done: true
            })
        }

        const data = {
            id: 'apigatewayid',
            name: 'apigatewayname',
            folderId: 'folderid',
            createdAt: '2021-01-01T00:00:00Z',
            openapiSpec: 'openapispec',
            domain: 'domain'
        }

        apiGateways = [ApiGateway.fromJSON(data)]
        return getOperation(ApiGateway, data)
    })
}

const ServiceAccountServiceMock = {
    list: jest.fn().mockImplementation(() => ({
        serviceAccounts
    }))
}

sdk.Session = jest.fn().mockImplementation(() => ({
    client: (service: { serviceName: string }) => {
        if (service.serviceName === 'yandex.cloud.serverless.apigateway.v1.ApiGatewayService') {
            return ApiGatewayServiceMock
        }
        if (service.serviceName === 'yandex.cloud.iam.v1.ServiceAccountService') {
            return ServiceAccountServiceMock
        }
    }
}))

sdk.waitForOperation = jest.fn().mockImplementation((op: Operation) => op)
sdk.decodeMessage = decodeMessage

sdk.__setApiGatewayList = (value: ApiGateway[]) => {
    apiGateways = value
}

sdk.__setServiceAccountList = (value: any[]) => {
    serviceAccounts = value
}

sdk.__setCreateGatewayFail = (value: boolean) => {
    createGatewayFail = value
}

sdk.__setUpdateGatewayFail = (value: boolean) => {
    updateGatewayFail = value
}

export = sdk
