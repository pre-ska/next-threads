import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

// import { fetchUser } from "@/lib/actions/user.actions";
import AccountProfile from "@/components/forms/AccountProfile";
import { fetchUser } from "@/lib/actions/user.actions";
 
async function Page() {
  // dohvati trenutnog usera iz Clerk auth
  const user = await currentUser();
  if (!user) return null; // to avoid typescript warnings
 
   // dohvati usera iz mongoDB po IDju iz clerka
  const userInfo = await fetchUser(user.id);

  // ako je prošao onboard - redirect
  if (userInfo?.onboarded) redirect("/"); 
 
  // ako nije -prikaži onboard 

  // podaci  koji će inicijalno popunit UI - AccountProfile komponenta
  // userInfo je iz mongoDB, user je iz Clerk auth
  const userData = {
    id: user.id ,
    objectId:  userInfo?._id  ,
    username: userInfo ? userInfo?.username : user.username,
    name: userInfo ? userInfo?.name : user.firstName ?? "",
    bio: userInfo ? userInfo?.bio : "",
    image: userInfo ? userInfo?.image : user.imageUrl,
  };
 
  return (
    <main className='mx-auto flex max-w-3xl flex-col justify-start px-10 py-20'>
      <h1 className='head-text'>Onboarding</h1>
      <p className='mt-3 text-base-regular text-light-2'>
        Complete your profile now, to use Threds.
      </p>

      <section className='mt-9 bg-dark-2 p-10'>
        <AccountProfile user={userData} btnTitle='Continue' />
      </section>
    </main>
  );
}

export default Page;
