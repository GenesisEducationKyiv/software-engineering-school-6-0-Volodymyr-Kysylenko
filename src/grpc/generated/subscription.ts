import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { ConfirmRequest as _subscription_ConfirmRequest, ConfirmRequest__Output as _subscription_ConfirmRequest__Output } from './subscription/ConfirmRequest.js';
import type { ConfirmResponse as _subscription_ConfirmResponse, ConfirmResponse__Output as _subscription_ConfirmResponse__Output } from './subscription/ConfirmResponse.js';
import type { ErrorResponse as _subscription_ErrorResponse, ErrorResponse__Output as _subscription_ErrorResponse__Output } from './subscription/ErrorResponse.js';
import type { GetSubscriptionsRequest as _subscription_GetSubscriptionsRequest, GetSubscriptionsRequest__Output as _subscription_GetSubscriptionsRequest__Output } from './subscription/GetSubscriptionsRequest.js';
import type { GetSubscriptionsResponse as _subscription_GetSubscriptionsResponse, GetSubscriptionsResponse__Output as _subscription_GetSubscriptionsResponse__Output } from './subscription/GetSubscriptionsResponse.js';
import type { SubscribeRequest as _subscription_SubscribeRequest, SubscribeRequest__Output as _subscription_SubscribeRequest__Output } from './subscription/SubscribeRequest.js';
import type { SubscribeResponse as _subscription_SubscribeResponse, SubscribeResponse__Output as _subscription_SubscribeResponse__Output } from './subscription/SubscribeResponse.js';
import type { Subscription as _subscription_Subscription, Subscription__Output as _subscription_Subscription__Output } from './subscription/Subscription.js';
import type { SubscriptionServiceClient as _subscription_SubscriptionServiceClient, SubscriptionServiceDefinition as _subscription_SubscriptionServiceDefinition } from './subscription/SubscriptionService.js';
import type { UnsubscribeRequest as _subscription_UnsubscribeRequest, UnsubscribeRequest__Output as _subscription_UnsubscribeRequest__Output } from './subscription/UnsubscribeRequest.js';
import type { UnsubscribeResponse as _subscription_UnsubscribeResponse, UnsubscribeResponse__Output as _subscription_UnsubscribeResponse__Output } from './subscription/UnsubscribeResponse.js';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  subscription: {
    ConfirmRequest: MessageTypeDefinition<_subscription_ConfirmRequest, _subscription_ConfirmRequest__Output>
    ConfirmResponse: MessageTypeDefinition<_subscription_ConfirmResponse, _subscription_ConfirmResponse__Output>
    ErrorResponse: MessageTypeDefinition<_subscription_ErrorResponse, _subscription_ErrorResponse__Output>
    GetSubscriptionsRequest: MessageTypeDefinition<_subscription_GetSubscriptionsRequest, _subscription_GetSubscriptionsRequest__Output>
    GetSubscriptionsResponse: MessageTypeDefinition<_subscription_GetSubscriptionsResponse, _subscription_GetSubscriptionsResponse__Output>
    SubscribeRequest: MessageTypeDefinition<_subscription_SubscribeRequest, _subscription_SubscribeRequest__Output>
    SubscribeResponse: MessageTypeDefinition<_subscription_SubscribeResponse, _subscription_SubscribeResponse__Output>
    Subscription: MessageTypeDefinition<_subscription_Subscription, _subscription_Subscription__Output>
    SubscriptionService: SubtypeConstructor<typeof grpc.Client, _subscription_SubscriptionServiceClient> & { service: _subscription_SubscriptionServiceDefinition }
    UnsubscribeRequest: MessageTypeDefinition<_subscription_UnsubscribeRequest, _subscription_UnsubscribeRequest__Output>
    UnsubscribeResponse: MessageTypeDefinition<_subscription_UnsubscribeResponse, _subscription_UnsubscribeResponse__Output>
  }
}

