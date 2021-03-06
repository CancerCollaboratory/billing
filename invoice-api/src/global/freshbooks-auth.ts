/**
 *
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Public License v3.0.
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


import * as fs from 'fs';
import { FreshbooksService, FreshbooksConfig } from '../service/freshbooks';

/* Freshbooks API reference
 * https://www.freshbooks.com/api/authentication
 */

// 36000 seconds = 10 hours - although Freshbooks allows up to 12 hours(43200);
// keeping it 10 hours allows sufficient window to overcome clock differences; time zone backward/forward etc.
const REFRESH_INTERVAL = 36000;
const NEWLINE_CHAR = '\r\n';
const LINE_DELIM = ':';
const COMMENT_SYMBOL = '#';

class FreshBooksAuth {
    private freshbooksService :FreshbooksService;

    private authFilePath :string;

    /*
      State
     */
    private lastUpdatedAt = 0;

    private refreshToken :string;

    private accessToken :string;

    private refreshRequired = false;

    private tokenRefresh :Promise<any>;

    private logger :any;

    constructor(config :FreshbooksConfig, authFilePath :string, logger :any) {
        this.freshbooksService = new FreshbooksService(config, null, logger, null);
        if (authFilePath == null) throw new Error('No Authentication file specified.');
        // check if read/write access is available on the file
        this.checkFilePermissions(authFilePath);
        // read auth file
        this.readAuthFile(authFilePath);
        this.authFilePath = authFilePath;
        this.logger = logger || console;
    }

    private async getNewAccessToken() :Promise<any> {
        // use refresh token to get new access token
        const accessTokenResponse = await this.freshbooksService.getAccessToken(this.refreshToken);

        return {
            refreshToken: accessTokenResponse.refresh_token,
            accessToken: accessTokenResponse.access_token,
        };
    }

    /*
        saves auth file in format:
        lastUpdatedAt:<value>\r\n
        refreshToken:<value>\r\n
        accessToken:<value>
    */
    private saveTokenInfoAsync(authFilePath :string) {
        const that = this;
        // create file data
        let tokenInfo = 'lastUpdatedAt:';
        tokenInfo += this.lastUpdatedAt + NEWLINE_CHAR;
        tokenInfo += `refreshToken:${this.refreshToken}${NEWLINE_CHAR}`;
        tokenInfo += `accessToken:${this.accessToken}`;
        fs.writeFile(authFilePath, tokenInfo, (err) => {
            if (err) throw err;
            that.logger.info(`${authFilePath} saved.`);
        });
    }

    private async lockedRefresh(currentTime) :Promise<any> {
        const newTokens = await this.getNewAccessToken();

        this.refreshToken = newTokens.refreshToken;
        this.accessToken = newTokens.accessToken;
        this.lastUpdatedAt = currentTime;
        // save token info asynchronously
        this.saveTokenInfoAsync(this.authFilePath);
        // reset the flag here
        this.refreshRequired = false;
    }

    async getLatestAccessToken() :Promise<any> {
        // check if it is time to refresh the tokens
        const currentTime = (new Date()).getTime();
        if (((currentTime - this.lastUpdatedAt) / 1000) >= REFRESH_INTERVAL) {
            this.logger.info('Getting Freshbooks access token..');
            // if there is a need to refresh and refresh flag is already true; it means a refresh is already in progress
            if (this.refreshRequired) await this.tokenRefresh;
            else {
                this.refreshRequired = true;
                this.tokenRefresh = this.lockedRefresh(currentTime);
                await this.tokenRefresh;
            }
        }
        return this.accessToken;
    }

    private checkFilePermissions(authFilePath :string) {
        try {
            fs.accessSync(authFilePath, fs.constants.R_OK | fs.constants.W_OK);
        } catch (e) {
            throw new Error('Either auth file doesn\'t exist or file doesn\'t have read and write permissions.');
        }
        // all required permissions available!
    }

    /* synchronously reads the auth file as that is essential for the proper initialization of this service
        Expects authfile in format:
         lastUpdatedAt:<value>\r\n
         refreshToken:<value>\r\n
         accessToken:<value>
     */
    private readAuthFile(authFilePath :string) {
        const contents = fs.readFileSync(authFilePath).toString();
        // get all lines
        let lines :Array<string>;
        if (contents.indexOf('\r\n') > 0) lines = contents.split('\r\n');
        else if (contents.indexOf('\n') > 0) lines = contents.split('\n');
        else throw new Error('Invalid data in Authentication file.');
        if (lines.length < 3) {
            throw new Error('Authentication file should be in this format:' +
                            'lastUpdatedAt:<value>\r\n' +
                             'refreshToken:<value>\r\n' +
                             'accessToken:<value>');
        }
        // ignore lines with comment symbol
        for (var idx = 0; idx < lines.length; idx++) {
            if (lines[idx].startsWith(COMMENT_SYMBOL)) continue;
            else break;
        }
        if (lines.length - idx < 3) {
            throw new Error('Authentication file should be in this format:' +
            'lastUpdatedAt:<value>\r\n' +
            'refreshToken:<value>\r\n' +
            'accessToken:<value>');
        }
        // get required values from each line
        this.lastUpdatedAt = Number(this.getValueFromLine(lines[idx], 'lastUpdatedAt').replace(/\s/g, ''));
        this.refreshToken = this.getValueFromLine(lines[idx + 1], 'refreshToken').replace(/\s/g, '');
        this.accessToken = this.getValueFromLine(lines[idx + 2], 'accessToken').replace(/\s/g, '');
    }

    private getValueFromLine(line :string, key :string) :string {
        if (line.indexOf(LINE_DELIM) < 0) throw new Error(`Invalid line in Authentication file:${line}`);
        const pair = line.split(LINE_DELIM);
        if (pair[0] != key) throw new Error(`Expecting key:${key} in line: ${line}`);
        return pair[1];
    }
}

export { FreshBooksAuth };
