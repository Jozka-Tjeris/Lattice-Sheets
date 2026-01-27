"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginForm() {
  return (
    <div className="items-center bg-white">
      <div className="flex justify-center py-8">
        <svg
          width="42"
          height="36"
          viewBox="0 0 200 170"
          style={{ shapeRendering: "geometricPrecision" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path
              fill="rgb(255, 186, 5)"
              d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"
            ></path>
            <path
              fill="rgb(57, 202, 255)"
              d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"
            ></path>
            <path
              fill="rgb(220, 4, 59)"
              d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
            ></path>
            <path
              fill="rgba(0, 0, 0, 0.25)"
              d="M88.0781,91.8464 L66.1741,102.4224 L12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
            ></path>
          </g>
        </svg>
      </div>

      <h1 className="mb-8 text-center text-3xl font-semibold">
        Welcome to "Not Airtable"
      </h1>

      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-xl bg-gray-100 p-8 shadow-lg">
          <form
            id="signInEmailForm"
            method="post"
            action="/auth/getLoginTypeForEmail"
          >
            <input
              type="hidden"
              name="_csrf"
              value="zhaXcLBn-b1ipSDJmJFe0bR-dBwYRyKqp5Ko"
            />
            <input type="hidden" name="urlToRedirectTo" value="" />
            <input type="hidden" name="countryCode" value="" />
            <input type="hidden" name="didConsentToMarketing" value="" />

            <div className="mb-6">
              <label
                htmlFor="emailLogin"
                className="block text-sm font-semibold"
              >
                Email
              </label>
              <input
                type="email"
                id="emailLogin"
                name="email"
                placeholder="Email address"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                spellCheck="false"
                autoFocus
              />
            </div>

            <button
              className="w-full rounded-lg bg-gray-500 py-3 text-white shadow-md focus:outline-none disabled:opacity-50"
              type="submit"
              disabled
            >
              Continue
            </button>
          </form>
        </div>

        <div className="my-8 text-center">
          <p className="text-lg text-gray-600">or</p>
        </div>

        <button className="border-gray-450 mb-1 flex w-full max-w-lg cursor-pointer items-center justify-center gap-2 rounded-lg border-1 py-3 shadow-md bg-gray-300">
          Sign in with Single Sign On
        </button>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="border-gray-450 mb-1 flex w-full max-w-lg cursor-pointer items-center justify-center gap-2 rounded-lg border-1 py-3 shadow-md"
        >
          <svg
            width="16"
            height="16"
            viewBox="-4 -4 24 24"
            fill="none"
            className="h-6 w-6"
          >
            <path
              d="M17.64,9.20454545 C17.64,8.56636364 17.5827273,7.95272727 17.4763636,7.36363636 L9,7.36363636 L9,10.845 L13.8436364,10.845 C13.635,11.97 13.0009091,12.9231818 12.0477273,13.5613636 L12.0477273,15.8195455 L14.9563636,15.8195455 C16.6581818,14.2527273 17.64,11.9454545 17.64,9.20454545 L17.64,9.20454545 Z"
              fill="#4285F4"
            ></path>
            <path
              d="M9,18 C11.43,18 13.4672727,17.1940909 14.9563636,15.8195455 L12.0477273,13.5613636 C11.2418182,14.1013636 10.2109091,14.4204545 9,14.4204545 C6.65590909,14.4204545 4.67181818,12.8372727 3.96409091,10.71 L0.957272727,10.71 L0.957272727,13.0418182 C2.43818182,15.9831818 5.48181818,18 9,18 L9,18 Z"
              fill="#34A853"
            ></path>
            <path
              d="M3.96409091,10.71 C3.78409091,10.17 3.68181818,9.59318182 3.68181818,9 C3.68181818,8.40681818 3.78409091,7.83 3.96409091,7.29 L3.96409091,4.95818182 L0.957272727,4.95818182 C0.347727273,6.17318182 0,7.54772727 0,9 C0,10.4522727 0.347727273,11.8268182 0.957272727,13.0418182 L3.96409091,10.71 L3.96409091,10.71 Z"
              fill="#FBBC05"
            ></path>
            <path
              d="M9,3.57954545 C10.3213636,3.57954545 11.5077273,4.03363636 12.4404545,4.92545455 L15.0218182,2.34409091 C13.4631818,0.891818182 11.4259091,0 9,0 C5.48181818,0 2.43818182,2.01681818 0.957272727,4.95818182 L3.96409091,7.29 C4.67181818,5.16272727 6.65590909,3.57954545 9,3.57954545 L9,3.57954545 Z"
              fill="#EA4335"
            ></path>
          </svg>
          Continue with Google
        </button>

        <a className="border-gray-450 flex w-full max-w-lg cursor-pointer items-center justify-center gap-2 rounded-lg border-1 py-3 shadow-md bg-gray-300">
          <svg width="16" height="16" viewBox="17 17 18 18" fill="none">
            <g
              id="White-Logo-Square-"
              stroke="none"
              strokeWidth="1"
              fill="none"
              fillRule="evenodd"
            >
              <path
                d="M28.2226562,20.3846154 C29.0546875,20.3846154 30.0976562,19.8048315 30.71875,19.0317864 C31.28125,18.3312142 31.6914062,17.352829 31.6914062,16.3744437 C31.6914062,16.2415766 31.6796875,16.1087095 31.65625,16 C30.7304687,16.0362365 29.6171875,16.640178 28.9492187,17.4494596 C28.421875,18.06548 27.9414062,19.0317864 27.9414062,20.0222505 C27.9414062,20.1671964 27.9648438,20.3121424 27.9765625,20.3604577 C28.0351562,20.3725366 28.1289062,20.3846154 28.2226562,20.3846154 Z M25.2929688,35 C26.4296875,35 26.9335938,34.214876 28.3515625,34.214876 C29.7929688,34.214876 30.109375,34.9758423 31.375,34.9758423 C32.6171875,34.9758423 33.4492188,33.792117 34.234375,32.6325493 C35.1132812,31.3038779 35.4765625,29.9993643 35.5,29.9389701 C35.4179688,29.9148125 33.0390625,28.9122695 33.0390625,26.0979021 C33.0390625,23.6579784 34.9140625,22.5588048 35.0195312,22.474253 C33.7773438,20.6382708 31.890625,20.5899555 31.375,20.5899555 C29.9804688,20.5899555 28.84375,21.4596313 28.1289062,21.4596313 C27.3554688,21.4596313 26.3359375,20.6382708 25.1289062,20.6382708 C22.8320312,20.6382708 20.5,22.5950413 20.5,26.2911634 C20.5,28.5861411 21.3671875,31.013986 22.4335938,32.5842339 C23.3476562,33.9129053 24.1445312,35 25.2929688,35 Z"
                id=""
                fill="#000"
                fillRule="nonzero"
              ></path>
            </g>
          </svg>
          Continue with Apple ID
        </a>

        <p className="mt-8 text-center text-sm">
          New here? Use a{" "}
          <a
            className="text-blue-600 hover:underline cursor-pointer" 
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Google account
          </a>
          <br/>
          It's the only way to sign in right now ¯\_(ツ)_/¯
        </p>
      </div>
    </div>
  );
}
