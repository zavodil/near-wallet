import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { Responsive, Input } from 'semantic-ui-react'
import { Translate } from 'react-localize-redux'

import sendJson from '../../tmp_fetch_send_json'
import LocalAlertBox from '../common/LocalAlertBox'
import FormButton from '../common/FormButton'

import styled from 'styled-components'
import { Recaptcha } from '../Recaptcha';
import { ACCOUNT_HELPER_URL } from '../../utils/wallet';

// FIXME: Use `debug` npm package so we can keep some debug logging around but not spam the console everywhere
const ENABLE_DEBUG_LOGGING = false;
const debugLog = (...args) => ENABLE_DEBUG_LOGGING && console.log('SetupSeedPhraseVerify:', ...args);

const CustomDiv = styled.div`

    input {
        margin-bottom: 30px !important;
    }

    .blue, .input {
        width: 100% !important;
    }

    h4 {
        margin-top: 20px;
    }

    .blue {
        margin-top: 20px !important;
    }

    .start-over {
        padding: 20px 0 0 0;
        color: #24272a;
        border-top: 2px solid #f8f8f8;
        margin-top: 48px;

        button {
            font-size: 16px !important;
            font-weight: 500;
            margin: 0 0 0 6px !important;
        }
    }

    .recaptcha-widget {
        margin-top: -10px;
    }
`


const SetupSeedPhraseVerify = (
    {
        enterWord,
        wordId,
        handleChangeWord,
        mainLoader,
        localAlert,
        onRecaptchaChange,
        isNewAccount,
        onSubmit
    },
    ref
) => {
    debugLog('Re-rendering', { isNewAccount: isNewAccount });
    const recaptchaRef = useRef(null);
    const [recaptchaToken, setRecaptchaToken] = useState();

    useImperativeHandle(ref, () => ({
        reset() {
            debugLog('in imperative handle reset()');
            return recaptchaRef.current.reset();
        }
    }))


    // TODO: Combine similar effect code into custom hook
    const [fundedAccountAvailable, setFundedAccountAvailable] = useState(false);
    useEffect(() => {
        debugLog('Checking available funded account status');
        const fetchIsFundedAccountAvailable = async () => {
            let available;

            try {
                ({ available } = await sendJson('GET', ACCOUNT_HELPER_URL + '/checkFundedAccountAvailable'));
            } catch (e) {
                debugLog('Failed check available funded account status');
                setFundedAccountAvailable(false);
                return;
            }

            debugLog('Funded account availability', { available });
            setFundedAccountAvailable(available);
        }

        if(process.env.RECAPTCHA_CHALLENGE_API_KEY && isNewAccount) {
            fetchIsFundedAccountAvailable();
        }
    }, []);

    const shouldRenderRecaptcha = process.env.RECAPTCHA_CHALLENGE_API_KEY && isNewAccount && fundedAccountAvailable;

    return (
        <CustomDiv>
            <h4><Translate id='input.enterWord.title' data={{ wordId: wordId + 1 }}/></h4>
            <Translate>
                {({ translate }) => (
                    <Input
                        name='enterWord'
                        value={enterWord}
                        onChange={handleChangeWord}
                        placeholder={translate('input.enterWord.placeholder')}
                        required
                        tabIndex='1'
                        pattern='[a-zA-Z ]*'
                        className={localAlert ? (localAlert.success ? 'success' : 'problem') : ''}
                        disabled={mainLoader}
                    />
                )}
            </Translate>
            <Responsive as={LocalAlertBox} localAlert={localAlert}/>
            {
                shouldRenderRecaptcha && <Recaptcha
                    ref={recaptchaRef}
                    onChange={(token) => {
                        debugLog('onChange from recaptcha', token);
                        setRecaptchaToken(token);
                        onRecaptchaChange(token);
                    }}
                    onFundAccountCreation={onSubmit}
                />
            }
            <FormButton
                type='submit'
                color='blue'
                disabled={!enterWord || mainLoader || (!recaptchaToken && shouldRenderRecaptcha)}
                sending={mainLoader}
                sendingString={isNewAccount ? 'button.creatingAccount' : 'button.verifying'}
            >
                <Translate id='button.verify'/>
            </FormButton>
        </CustomDiv>
    );
}

export default forwardRef(SetupSeedPhraseVerify)