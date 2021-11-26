import React, { useState } from 'react';
import { useStore } from 'effector-react';
import * as tyron from 'tyron';
import { Lock, SocialRecover, Sign } from '../..';
import styles from './styles.module.scss';
import { $contract } from 'src/store/contract';
import { $doc } from 'src/store/did-doc';
import { $user } from 'src/store/user';
import { $arconnect } from 'src/store/arconnect';

function Component() {
    const doc = useStore($doc);
    const user = useStore($user);
    const contract = useStore($contract);
    const arConnect = useStore($arconnect);

    const [hideRecovery, setHideRecovery] = useState(true);
    const [recoveryLegend, setRecoveryLegend] = useState('recover');

    const [hideLock, setHideLock] = useState(true);
    const [lockLegend, setLockLegend] = useState('lock');

    const [hideSig, setHideSig] = useState(true);
    const [sigLegend, setSigLegend] = useState('sign address');

    const is_operational =
        contract?.status !== tyron.Sidetree.DIDStatus.Deactivated &&
        contract?.status !== tyron.Sidetree.DIDStatus.Locked;

    return (
        <div style={{ marginTop: '14%' }}>
            {
                hideLock && hideSig &&
                <h2 style={{ color: 'lightblue', marginBottom: '7%' }}>
                    DID social recovery
                </h2>
            }
            {
                doc?.guardians.length === 0 && hideSig && hideLock &&
                <code>
                    <ul>
                        <li>
                            Social recovery has not been enabled by {user?.nft} yet
                        </li>
                    </ul>
                </code>
            }
            <ul>
                <li>
                    {
                        doc?.guardians.length !== 0 && hideLock && hideSig &&
                        hideRecovery &&
                        <>
                            <p>
                                {user?.nft} has {doc?.guardians.length} guardians
                            </p>
                            <button
                                type="button"
                                className={styles.button}
                                onClick={() => {
                                    setHideRecovery(false);
                                    setRecoveryLegend('back');
                                }}
                            >
                                <p className={styles.buttonColorText}>
                                    {recoveryLegend}
                                </p>
                            </button>
                        </>
                    }
                    {
                        !hideRecovery &&
                        <div>
                            <SocialRecover />
                        </div>
                    }
                </li>
                <li>
                    {
                        hideRecovery && hideLock &&
                        hideSig &&
                        <button
                            type="button"
                            className={styles.button}
                            onClick={() => {
                                if (arConnect === null) {
                                    alert('To continue, connect your SSI Private Key: Click on Connect -> SSI Private Key')
                                } else {
                                    setHideSig(false);
                                    setSigLegend('back');
                                }
                            }}
                        >
                            <p className={styles.buttonText}>
                                {sigLegend}
                            </p>
                        </button>
                    }
                    {
                        !hideSig &&
                        <Sign />
                    }
                </li>
                <li>
                    {
                        is_operational &&
                        contract?.status !== tyron.Sidetree.DIDStatus.Deployed &&
                        hideRecovery && hideSig &&
                        hideLock &&
                        <p><span style={{ marginRight: '3%' }}>Danger zone</span>
                            <button
                                type="button"
                                className={styles.button}
                                onClick={() => {
                                    if (arConnect === null) {
                                        alert('To continue, connect your SSI Private Key: Click on Connect -> SSI Private Key')
                                    } else {
                                        setHideLock(false);
                                        setLockLegend('back');
                                    }
                                }}
                            >
                                <p className={styles.buttonColorDText}>
                                    {lockLegend}
                                </p>
                            </button>
                        </p>
                    }
                    {
                        !hideLock &&
                        <div>
                            <Lock />
                        </div>
                    }
                </li>
            </ul>
        </div>
    );
}

export default Component;
