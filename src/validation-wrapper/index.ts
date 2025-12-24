import { error, json, RequestHandler } from "@sveltejs/kit";
import type { OpenAPIV3 } from "openapi-types";
import { RouteConfig } from "../types/routeConfig.ts";

export async function validationWrapper(
  _config: RouteConfig,
  method: Uppercase<OpenAPIV3.HttpMethods>,
  requestHandler: RequestHandler
): Promise<RequestHandler> {
  return async (event) => {
    const clonedRequest = event.request.clone();
    // TODO: implement input validation based on _config and method

    // @ts-expect-error - extend event with validated inputs, json, and error
    event.json = json;
    // @ts-expect-error - extend event with validated inputs, json, and error
    event.error = error;
    // TODO: Extend event.validated with validated inputs
    const response = await requestHandler(event);
    const clonedResponse = response.clone();
    // TODO: implement output validation based on _config and method
    return response;
  };
}
