import requests
from urllib.parse import quote

# ==========================================
# 2FACTOR CONFIGURATION
# ==========================================

API_KEY = "b3fa3ccd-b3a1-11f1-af74-0200cd936042"

BASE_URL = "https://2factor.in/API/V1"

TEMPLATE_NAME = "CliniConnect_OTP"


# ==========================================
# SEND OTP
# ==========================================

def send_otp(phone_number):

    url = (
        f"{BASE_URL}/{API_KEY}/SMS/"
        f"{phone_number}/AUTOGEN/"
        f"{quote(TEMPLATE_NAME, safe='')}"
    )

    try:

        response = requests.get(
            url,
            timeout=15
        )

        response.raise_for_status()

        data = response.json()

        print("\n2Factor Response:", data)

        if data.get("Status") == "Success":

            session_id = data.get("Details")

            print("\nOTP sent successfully!")
            print("Session ID:", session_id)

            return session_id

        else:

            print("\nFailed to send OTP.")
            print("Details:", data)

            return None

    except requests.RequestException as error:

        print("\nNetwork/API Error:", error)

        return None

    except ValueError:

        print("\nInvalid JSON response from 2Factor.")

        return None


# ==========================================
# VERIFY OTP
# ==========================================

def verify_otp(session_id, otp):

    url = (
        f"{BASE_URL}/{API_KEY}/SMS/VERIFY/"
        f"{quote(str(session_id), safe='')}/"
        f"{quote(str(otp), safe='')}"
    )

    try:

        response = requests.get(
            url,
            timeout=15
        )

        response.raise_for_status()

        data = response.json()

        print("\nVerification Response:", data)

        if data.get("Status") == "Success":

            print("\nOTP VERIFIED SUCCESSFULLY!")

            return True

        else:

            print("\nINVALID OTP!")

            return False

    except requests.RequestException as error:

        print("\nNetwork/API Error:", error)

        return False

    except ValueError:

        print("\nInvalid JSON response from 2Factor.")

        return False


# ==========================================
# MAIN PROGRAM
# ==========================================

def main():

    print("================================")
    print("   CLINICONNECT OTP SYSTEM")
    print("================================")

    phone_number = input(
        "\nEnter receiver mobile number (+countrycode): "
    ).strip()

    if not phone_number.startswith("+"):

        print("Please enter number with country code.")
        print("Example: +916206956205")

        return

    # Remove the + sign for the 2Factor URL
    phone_number = phone_number[1:]

    session_id = send_otp(phone_number)

    if not session_id:

        print("\nOTP sending failed.")

        return

    print("\nCheck your mobile for the OTP.")

    otp = input(
        "\nEnter OTP received: "
    ).strip()

    if not otp.isdigit():

        print("OTP must contain only digits.")

        return

    if verify_otp(session_id, otp):

        print("\nPhone number verified.")
        print("You can now continue registration.")

    else:

        print("\nPhone verification failed.")
        print("Please try again.")


if __name__ == "__main__":

    main()
