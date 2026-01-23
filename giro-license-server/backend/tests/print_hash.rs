use giro_license_server::utils::hash_password;

#[tokio::test]
async fn print_password_hash() {
    let password = "testpassword123";
    // let hash = hash_password(password).unwrap();
    // println!("HASH_START:{} :HASH_END", hash);

    let specific_hash = "$argon2id$v=19$m=19456,t=2,p=1$bMlAmeGlQOFLmASSDIqeNg$yAb5LAIMIPDqcc4GZOYNfVTXbpd85AIOCmxq45YR0Eo";
    let verifies_specific = verify_password(password, specific_hash).unwrap();
    println!("Verifies with specific hash: {}", verifies_specific);
}
