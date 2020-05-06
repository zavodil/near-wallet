import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Translate } from 'react-localize-redux'
import { GoogleReCaptchaProvider, GoogleReCaptcha } from 'react-google-recaptcha-v3'
import CreateAccountForm from './CreateAccountForm'
import AccountFormSection from './AccountFormSection'
import AccountFormContainer from './AccountFormContainer'
import { checkNewAccount, createNewAccount, clear, refreshAccount, resetAccounts, redirectToApp } from '../../actions/account'
import { ACCOUNT_ID_SUFFIX } from '../../utils/wallet'
import { wallet } from '../../utils/wallet'

class CreateAccount extends Component {
    state = {
        loader: false,
        accountId: '',
        token: '',
        recaptchaFallback: false
    }

    componentDidMount = () => {
        const { loginError, resetAccounts } = this.props;

        if (loginError) {
            console.error('Error loading account:', loginError)

            if (loginError.indexOf('does not exist while viewing') !== -1) {
                resetAccounts()
            }
        }
    }

    componentWillUnmount = () => {
        this.props.clear()
    }

    handleChange = (e, { name, value }) => {
        if (value.length > 0) {
            this.setState({[name]: `${value}.${ACCOUNT_ID_SUFFIX}`})
        } else {
            this.setState({[name]: value})
        }
    }

    handleLoginWithGoogle = async () => {
        const TorusSdk = await import("@toruslabs/torus-direct-web-sdk");
        const torusdirectsdk = new TorusSdk({
            baseUrl: "http://localhost:1234/torus-support/",
            GOOGLE_CLIENT_ID: "206857959151-uebr6impkept4p3q6qv3e2bdevs9mro6.apps.googleusercontent.com",
            proxyContractAddress: "0x4023d2a0D330bF11426B12C6144Cfb96B7fa6183", // details for test net
            network: "ropsten", // details for test net
        });
        Object.defineProperty(torusdirectsdk.config, 'redirect_uri', { value: `${torusdirectsdk.config.baseUrl}redirect.html` });
                     
        await torusdirectsdk.init();
        const loginDetails = await torusdirectsdk.triggerLogin('google', 'google-near');

        await wallet.createOrRecoverAccountFromTorus(loginDetails);

        this.props.refreshAccount()
        this.props.redirectToApp()
    }

    handleCreateAccount = () => {
        const { accountId, token } = this.state;

        const fundingKey = this.props.match.params.fundingKey;
        const fundingContract = this.props.match.params.fundingContract;

        this.setState({ loader: true });
        this.props.createNewAccount(accountId, fundingKey, fundingContract, token)
        .then(({ error, payload }) => {
            if (error) {
                if (payload.statusCode === 402) {
                    this.setState({ recaptchaFallback: true });
                }
                this.setState({ loader: false });
                return;
            }

            this.handleCreateAccountSuccess();
        });
    }

    handleCreateAccountSuccess = () => {
        const { accountId } = this.state;

        this.props.refreshAccount();
        let nextUrl = process.env.DISABLE_PHONE_RECOVERY === 'yes' ? `/setup-seed-phrase/${accountId}` : `/set-recovery/${accountId}`;
        this.props.history.push(nextUrl);
        this.setState({ loader: false });
    }

    render() {
        const { loader, accountId, recaptchaFallback } = this.state
        const { requestStatus, formLoader, checkNewAccount, location, loginResetAccounts } = this.props
        const useRequestStatus = accountId.length > 0 ? requestStatus : undefined;

        return (
            <AccountFormContainer
                location={this.props.location}
                title={<Translate id='createAccount.pageTitle' />}
                text={<Translate id='createAccount.pageText' />}
                loginResetAccounts={loginResetAccounts}
            >
                <AccountFormSection
                    requestStatus={useRequestStatus}
                    handleSubmit={this.handleCreateAccount}
                    location={location}
                >
                    <CreateAccountForm
                        loader={loader}
                        requestStatus={useRequestStatus}
                        formLoader={formLoader}
                        handleChange={this.handleChange}
                        handleLoginWithGoogle={this.handleLoginWithGoogle}
                        recaptchaFallback={recaptchaFallback}
                        verifyRecaptcha={token => this.setState({ token: token }, this.handleCreateAccount)}
                        checkAvailability={checkNewAccount}
                        accountId={accountId}
                    />
                    <GoogleReCaptchaProvider reCaptchaKey="6LfSgNoUAAAAABKb2sk4Rs3TS0RMx9zrVwyTBSc6">
                        <GoogleReCaptcha onVerify={token => this.setState({ token: token })}/>
                    </GoogleReCaptchaProvider>
                </AccountFormSection>
            </AccountFormContainer>
        )
    }
}

const mapDispatchToProps = {
    checkNewAccount,
    createNewAccount,
    clear,
    refreshAccount,
    redirectToApp,
    resetAccounts
}

const mapStateToProps = ({ account }) => ({
    ...account
})

export const CreateAccountWithRouter = connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateAccount)
