import CryptoJS from "crypto-js";

const AES_KEY = (import.meta.env.VITE_CIPHER_KEY as string) || "";

export const Cipher = {
  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, AES_KEY).toString();
  },
  decrypt(ct: string): string {
    return CryptoJS.AES.decrypt(ct, AES_KEY).toString(CryptoJS.enc.Utf8);
  },
};
