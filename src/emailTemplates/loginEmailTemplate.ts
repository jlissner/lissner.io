import { APP_URL } from "../config";

type LoginEmailTemplateOptions = {
  code: number;
  browser: string | undefined;
  os: string | undefined;
};

export function loginEmailTemplate({
  code,
  browser = "Unknown Browser",
  os = "Unknown OS",
}: LoginEmailTemplateOptions) {
  const now = new Date();
  const date = now.toLocaleDateString(undefined, {});
  const time = now.toLocaleTimeString(undefined, {});

  return `
<html>
  <head>
    <style>
      .lissner-io {
        background: silver;
        padding: 32px 16px;
        display: grid;
        justify-content: center;
        box-sizing: content-box;
      }

      .lissner-io a, .lissner-io a:visited {
        background: darkgreen;
        color: snow;
        margin: 0;
        width: max-content;
        text-align: center;
        padding: 16px;
        font-size: 18px;
        border-radius: 4px;
        text-decoration: none;
        font-weight: bold;
        transition: all .18s ease-in-out;
        box-shadow: 1px 1px 2px #222;
        transform: translatex(0) translatey(0);
        box-sizing: content-box;
        display: block;
      }
      
      .lissner-io a:hover, .lissner-io a:active {
        background: forestgreen;
      }
      
      .lissner-io a:focus {
        background: forestgreen;
        box-shadow: 0px 0px 2px #222;
        transform: translatex(1px) translatey(1px);
      }

      .lissner-io h1 {
        margin: 0;
        color: #333;
        box-sizing: content-box;
      }

      .lissner-io p {
        color: dimgray;
        margin: 16px 0;
        box-sizing: content-box;
        font-size: 16px;
      }

      .lissner-io .main {
        padding: 16px;
        background: snow;
        height: max-content;
        box-sizing: content-box;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="lissner-io">
      <div class="main">
        <h1>Lissner Family Login</h1>

        <p>
          Click the button below to securly log in.
          <br />
          The magic link will expire in 20 minutes.
        </p>

        <a href="${APP_URL}/login?code=${code}" target="_blank" rel="noopener noreferrer">Log In</a>

        <p>Or use code ${code} to log in</p>

        <p>
          <small>
            This login was requested using ${browser} on ${os} at ${time} on ${date}
          </small>
        </p>
      </div>
    </div>
  </body>
</html>
`;
}
