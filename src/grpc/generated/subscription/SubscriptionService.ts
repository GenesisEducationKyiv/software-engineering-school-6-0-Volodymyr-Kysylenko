// Original file: proto/subscription.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { ConfirmRequest as _subscription_ConfirmRequest, ConfirmRequest__Output as _subscription_ConfirmRequest__Output } from '../subscription/ConfirmRequest.js';
import type { ConfirmResponse as _subscription_ConfirmResponse, ConfirmResponse__Output as _subscription_ConfirmResponse__Output } from '../subscription/ConfirmResponse.js';
import type { GetSubscriptionsRequest as _subscription_GetSubscriptionsRequest, GetSubscriptionsRequest__Output as _subscription_GetSubscriptionsRequest__Output } from '../subscription/GetSubscriptionsRequest.js';
import type { GetSubscriptionsResponse as _subscription_GetSubscriptionsResponse, GetSubscriptionsResponse__Output as _subscription_GetSubscriptionsResponse__Output } from '../subscription/GetSubscriptionsResponse.js';
import type { SubscribeRequest as _subscription_SubscribeRequest, SubscribeRequest__Output as _subscription_SubscribeRequest__Output } from '../subscription/SubscribeRequest.js';
import type { SubscribeResponse as _subscription_SubscribeResponse, SubscribeResponse__Output as _subscription_SubscribeResponse__Output } from '../subscription/SubscribeResponse.js';
import type { UnsubscribeRequest as _subscription_UnsubscribeRequest, UnsubscribeRequest__Output as _subscription_UnsubscribeRequest__Output } from '../subscription/UnsubscribeRequest.js';
import type { UnsubscribeResponse as _subscription_UnsubscribeResponse, UnsubscribeResponse__Output as _subscription_UnsubscribeResponse__Output } from '../subscription/UnsubscribeResponse.js';

export interface SubscriptionServiceClient extends grpc.Client {
  Confirm(argument: _subscription_ConfirmRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  Confirm(argument: _subscription_ConfirmRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  Confirm(argument: _subscription_ConfirmRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  Confirm(argument: _subscription_ConfirmRequest, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  confirm(argument: _subscription_ConfirmRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  confirm(argument: _subscription_ConfirmRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  confirm(argument: _subscription_ConfirmRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  confirm(argument: _subscription_ConfirmRequest, callback: grpc.requestCallback<_subscription_ConfirmResponse__Output>): grpc.ClientUnaryCall;
  
  GetSubscriptions(argument: _subscription_GetSubscriptionsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  GetSubscriptions(argument: _subscription_GetSubscriptionsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  GetSubscriptions(argument: _subscription_GetSubscriptionsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  GetSubscriptions(argument: _subscription_GetSubscriptionsRequest, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  getSubscriptions(argument: _subscription_GetSubscriptionsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  getSubscriptions(argument: _subscription_GetSubscriptionsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  getSubscriptions(argument: _subscription_GetSubscriptionsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  getSubscriptions(argument: _subscription_GetSubscriptionsRequest, callback: grpc.requestCallback<_subscription_GetSubscriptionsResponse__Output>): grpc.ClientUnaryCall;
  
  Subscribe(argument: _subscription_SubscribeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  Subscribe(argument: _subscription_SubscribeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  Subscribe(argument: _subscription_SubscribeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  Subscribe(argument: _subscription_SubscribeRequest, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  subscribe(argument: _subscription_SubscribeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  subscribe(argument: _subscription_SubscribeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  subscribe(argument: _subscription_SubscribeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  subscribe(argument: _subscription_SubscribeRequest, callback: grpc.requestCallback<_subscription_SubscribeResponse__Output>): grpc.ClientUnaryCall;
  
  Unsubscribe(argument: _subscription_UnsubscribeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  Unsubscribe(argument: _subscription_UnsubscribeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  Unsubscribe(argument: _subscription_UnsubscribeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  Unsubscribe(argument: _subscription_UnsubscribeRequest, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  unsubscribe(argument: _subscription_UnsubscribeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  unsubscribe(argument: _subscription_UnsubscribeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  unsubscribe(argument: _subscription_UnsubscribeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  unsubscribe(argument: _subscription_UnsubscribeRequest, callback: grpc.requestCallback<_subscription_UnsubscribeResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface SubscriptionServiceHandlers extends grpc.UntypedServiceImplementation {
  Confirm: grpc.handleUnaryCall<_subscription_ConfirmRequest__Output, _subscription_ConfirmResponse>;
  
  GetSubscriptions: grpc.handleUnaryCall<_subscription_GetSubscriptionsRequest__Output, _subscription_GetSubscriptionsResponse>;
  
  Subscribe: grpc.handleUnaryCall<_subscription_SubscribeRequest__Output, _subscription_SubscribeResponse>;
  
  Unsubscribe: grpc.handleUnaryCall<_subscription_UnsubscribeRequest__Output, _subscription_UnsubscribeResponse>;
  
}

export interface SubscriptionServiceDefinition extends grpc.ServiceDefinition {
  Confirm: MethodDefinition<_subscription_ConfirmRequest, _subscription_ConfirmResponse, _subscription_ConfirmRequest__Output, _subscription_ConfirmResponse__Output>
  GetSubscriptions: MethodDefinition<_subscription_GetSubscriptionsRequest, _subscription_GetSubscriptionsResponse, _subscription_GetSubscriptionsRequest__Output, _subscription_GetSubscriptionsResponse__Output>
  Subscribe: MethodDefinition<_subscription_SubscribeRequest, _subscription_SubscribeResponse, _subscription_SubscribeRequest__Output, _subscription_SubscribeResponse__Output>
  Unsubscribe: MethodDefinition<_subscription_UnsubscribeRequest, _subscription_UnsubscribeResponse, _subscription_UnsubscribeRequest__Output, _subscription_UnsubscribeResponse__Output>
}
