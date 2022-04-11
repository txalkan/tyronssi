import * as tyron from "tyron";
import * as zcrypto from "@zilliqa-js/crypto";
import { randomBytes, toChecksumAddress } from "@zilliqa-js/crypto";
import { useStore } from "effector-react";
import React from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { HTTPProvider } from "@zilliqa-js/core";
import { Transaction } from "@zilliqa-js/account";
import { BN, Long } from "@zilliqa-js/util";
import { Donate } from "../../../../..";
import { $contract } from "../../../../../../src/store/contract";
import {
  $donation,
  updateDonation,
} from "../../../../../../src/store/donation";
import { decryptKey, operationKeyPair } from "../../../../../../src/lib/dkms";
import { $arconnect } from "../../../../../../src/store/arconnect";
import { $doc } from "../../../../../../src/store/did-doc";
import { $net } from "../../../../../../src/store/wallet-network";
import { ZilPayBase } from "../../../../../ZilPay/zilpay-base";
import { $user } from "../../../../../../src/store/user";
import {
  setTxStatusLoading,
  showTxStatusModal,
  setTxId,
  hideTxStatusModal,
} from "../../../../../../src/app/actions";

function Component /*
@todo-checked - make sure to test thoroughly that the transaction works properly.
TEST BEFORE COMMITTING*/({
  ids,
  patches,
}: {
  ids: string[];
  patches: tyron.DocumentModel.PatchModel[];
}) {
  const Router = useRouter();
  const dispatch = useDispatch();
  const username = useStore($user)?.name;
  const donation = useStore($donation);
  const contract = useStore($contract);
  const arConnect = useStore($arconnect);
  const dkms = useStore($doc)?.dkms;
  const net = useStore($net);

  const handleSubmit = async () => {
    if (arConnect !== null && contract !== null && donation !== null) {
      try {
        const zilpay = new ZilPayBase();

        let key_input: Array<{ id: string }> = [];
        for (let i = 0; i < ids.length; i += 1) {
          key_input.push({
            id: ids[i],
          });
        }

        const verification_methods: tyron.TyronZil.TransitionValue[] = [];
        const doc_elements: tyron.DocumentModel.DocumentElement[] = [];

        for (const input of key_input) {
          // Creates the cryptographic DID key pair
          const doc = await operationKeyPair({
            arConnect: arConnect,
            id: input.id,
            addr: contract.addr,
          });
          doc_elements.push(doc.element);
          verification_methods.push(doc.parameter);
        }

        let document = verification_methods;
        let elements = doc_elements;
        let signature: string = "";
        await tyron.Sidetree.Sidetree.processPatches(contract.addr, patches)
          .then(async (res) => {
            document.concat(res.updateDocument);
            elements.concat(res.documentElements);
            const hash = await tyron.DidCrud.default.HashDocument(elements);
            try {
              const encrypted_key = dkms.get("update");
              const private_key = await decryptKey(arConnect, encrypted_key);
              const public_key = zcrypto.getPubKeyFromPrivateKey(private_key);
              signature = zcrypto.sign(
                Buffer.from(hash, "hex"),
                private_key,
                public_key
              );
            } catch (error) {
              throw Error("Identity verification unsuccessful.");
            }
            // Donation
            let tyron_: tyron.TyronZil.TransitionValue;
            tyron_ = await tyron.Donation.default.tyron(donation);

            const tx_params = await tyron.TyronZil.default.CrudParams(
              contract.addr,
              document,
              await tyron.TyronZil.default.OptionParam(
                tyron.TyronZil.Option.some,
                "ByStr64",
                "0x" + signature
              ),
              tyron_
            );
            toast.info(
              `You're about to submit a DID Update transaction. Confirm with your DID Controller wallet.`,
              {
                position: "top-center",
                autoClose: 6000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
              }
            );

            dispatch(setTxStatusLoading("true"));
            dispatch(showTxStatusModal());

            const generateChecksumAddress = () =>
              toChecksumAddress(randomBytes(20));
            let tx = new Transaction(
              {
                version: 0,
                toAddr: generateChecksumAddress(),
                amount: new BN(0),
                gasPrice: new BN(1000),
                gasLimit: Long.fromNumber(1000),
              },
              new HTTPProvider("https://dev-api.zilliqa.com/")
            );
            await zilpay
              .call({
                contractAddress: contract.addr,
                transition: "DidUpdate",
                params: tx_params as unknown as Record<string, unknown>[],
                amount: String(donation),
              })
              .then(async (res) => {
                dispatch(setTxId(res.ID));
                dispatch(setTxStatusLoading("submitted"));
                try {
                  tx = await tx.confirm(res.ID);
                  if (tx.isConfirmed()) {
                    dispatch(setTxStatusLoading("confirmed"));
                    updateDonation(null);
                    window.open(
                      `https://viewblock.io/zilliqa/tx/${res.ID}?network=${net}`
                    );
                    Router.push(`/${username}/did/doc`);
                  } else if (tx.isRejected()) {
                    dispatch(hideTxStatusModal());
                    dispatch(setTxStatusLoading("idle"));
                    setTimeout(() => {
                      toast.error("Transaction failed.", {
                        position: "top-right",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "dark",
                      });
                    }, 1000);
                  }
                } catch (err) {
                  dispatch(hideTxStatusModal());
                  throw err;
                }
              })
              .catch((error) => {
                dispatch(hideTxStatusModal());
                throw error;
              });
          })
          .catch((error) => {
            throw error;
          });
      } catch (error) {
        toast.error(String(error), {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
      }
    }
  };

  return (
    <div>
      <Donate />
      {donation !== null && (
        <div style={{ marginTop: "14%", textAlign: "center" }}>
          <button type="button" className="button" onClick={handleSubmit}>
            <strong style={{ color: "#ffff32" }}>update did</strong>
          </button>
        </div>
      )}
    </div>
  );
}

export default Component;