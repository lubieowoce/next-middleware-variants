import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import * as uuid from "uuid";

const userIdStorage = new AsyncLocalStorage<{ userId: string }>();

export const getUserId = () => {
  // if we have a store, we're in the middleware.
  const store = userIdStorage.getStore();
  if (store) {
    return store.userId;
  }
  // otherwise, we're in render, and we should use cookies().
  return cookies().get(USER_ID_COOKIE)?.value || null;
};

const USER_ID_COOKIE = "user_id";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export async function withUserId(
  request: NextRequest,
  next: () => Promise<NextResponse | undefined>,
) {
  const origUserId = request.cookies.get(USER_ID_COOKIE)?.value || null;
  const userId = origUserId ?? uuid.v4();
  if (!origUserId) {
    // This is a very lazy way of doing it, but i cannot be bothered to figure out
    // how to set it in one request while also allowing other middlewares to do stuff
    // (we'd need to do the equivalent of setting headers here in case it's read during render:
    //  https://nextjs.org/docs/app/building-your-application/routing/middleware#setting-headers)
    // but that's annoying to fit into the next() convention here
    
    // console.log("user-id middleware :: assigning new user ID");
    const response = NextResponse.redirect(request.url, { status: 307 });
    response.cookies.set(USER_ID_COOKIE, userId, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    });
    return response;
  }
  return userIdStorage.run({ userId }, next);
}
