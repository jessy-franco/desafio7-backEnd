import jwt from "jsonwebtoken";
import UsersDao from "../daos/userDao.js";
import {isAdmin} from "../middlewares/auth.middleware.js"
import * as validators from './validators.js';


const sessionController = {
    register: async (req, res) => {
        const userData = req.body;

        const validationResult = validators.validateRegistrationData(userData);

        if (!validationResult.success) {
            return res.status(400).json({ status: 400, error: validationResult.error });
        }

        let emailUsed = await UsersDao.getUserByEmail(userData.email);

        if (emailUsed) {
            return res.status(400).json({ status: 400, error: "Email already used" });
        }

        await UsersDao.insert(userData.first_name, userData.last_name, userData.age, userData.email, userData.password);
        return res.redirect("/login?Registro_con_exito_,_puede_iniciar_sesion");
    },

    login: async (req, res) => {
        /* let email = req.body.email;
        let password = req.body.password; */
        const { email, password } = req.body;

        const validation = validators.validateLoginData(email, password);

        if (!validation.success) {
            return res.redirect(`/login?error=${validation.error}`)
        }

        let user = await UsersDao.getUserByCreds(email, password);

        if (!user) {
            return res.redirect("/login?error=Usuario_y/o_contraseña_incorrectas");
        }

        // Verificar si el usuario es administrador
        if (isAdmin(user)) {
            let token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.cookie("jwt", token, { signed: true, httpOnly: true, maxAge: 1000 * 60 * 60 });
            res.render("products", { isAdmin: true });
        } else {
            let token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.cookie("jwt", token, { signed: true, httpOnly: true, maxAge: 1000 * 60 * 60 });
            return res.redirect("/api/products?inicioSesion=true");
        }
    },
    getCurrentUser: (req, res) => {
        res.json(req.user);
    },
    logout: (req, res) => {
        res.clearCookie("jwt");
        /* res.status(200).json({status:200, msg:"Logged out"}); */
        return res.redirect("/home?cierre_de_sesion_ok")
    },
    authenticateWithGithub: (req, res, next) => {
        // Verificar si el usuario ya está autenticado
        if (req.isAuthenticated()) {
            /* Si el usuario ya está autenticado, redirigirlo a la página de productos con la señal de inicio de sesión */
            return res.redirect("/api/products?inicioSesion=true");
        }
        /* Si el usuario no está autenticado, continuar con el proceso de autenticación de GitHub */
        passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
    },
    githubCallback: async (req, res) => {
        try {
            // Intentar autenticar al usuario con Passport
            await new Promise((resolve, reject) => {
                passport.authenticate("github", (err, user) => {
                    if (err) {
                        // Si hay un error, rechazar la promesa con el error
                        return reject(err);
                    }
                    // Si el usuario se autentica correctamente, resolver la promesa con el usuario
                    resolve(user);
                })(req, res);
            });

            // Si llegamos a este punto, significa que el usuario se autenticó correctamente

            res.redirect("/api/products?inicioSesion=true");
        } catch (error) {
            // Si se produce un error durante la autenticación, manejarlo aquí
            console.error("Error durante la autenticación:", error);
            res.redirect("/login?error=Usuario_y/o_contraseña_incorrectas");
        }
    },
    logoutGithub: (req, res, next) => {
        req.logout(function (err) {
            if (err) {
                return next(err); // Manejar errores si ocurren
            }
            res.redirect('/login?Usuario_deslogueado'); // Redirigir al usuario a la página de inicio de sesión después de cerrar sesión correctamente
        });
    },
    check:(req, res) => {
        // Obtener el token JWT del encabezado de autorización
        const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    
        if (!token) {
            return res.status(401).json({ message: 'Acceso no autorizado' });
        }
    
        // Verificar y decodificar el token JWT
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Token inválido' });
            }
    
            // Verificar si el usuario es un administrador (puedes personalizar esta lógica según tus requisitos)
            const isAdmin = decoded.isAdmin;
    
            // Enviar una respuesta indicando si el usuario es un administrador o no
            res.json({ isAdmin });
        });
    }
    
};

export default sessionController;




